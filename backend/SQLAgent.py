import os
from dotenv import load_dotenv
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import SQLDatabaseToolkit
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage

load_dotenv()

def load_model():
    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    model_name = os.getenv("LLM_MODEL")
    if provider == "openai":
        m = model_name or "gpt-4o"
        return ChatOpenAI(model=m), {"model": m, "provider": "openai"}
    elif provider == "anthropic":
        m = model_name or "claude-3-5-sonnet-20241022"
        return ChatAnthropic(model=m), {"model": m, "provider": "anthropic"}
    else:
        m = model_name or "llama-3.3-70b-versatile"
        return ChatGroq(model=m, temperature=0), {"model": m, "provider": "groq"}

def load_database(db_url: str):
    return SQLDatabase.from_uri(db_url)

def create_agent(model, database, doc_context: str = "", user_context: str = ""):
    tools = SQLDatabaseToolkit(db=database, llm=model).get_tools()

    prompt = f"""You are a data assistant with access to SQL database tools.

Rules:
- Only run SELECT queries. Never INSERT, UPDATE, DELETE, DROP, or any write operation.
- Do not fabricate information. Only answer from tool results.
- If nothing is found, say: I could not find the requested information.
{f"User context about this database: {user_context}" if user_context else ""}
{f"Relevant document context: {doc_context}" if doc_context else ""}
"""
    return create_react_agent(model, tools, prompt=SystemMessage(content=prompt))

def ask_question(agent, question: str):
    result = agent.invoke({"messages": [{"role": "user", "content": question}]})
    return result["messages"][-1].content