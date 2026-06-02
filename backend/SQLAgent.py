import os
from dotenv import load_dotenv
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_groq import ChatGroq

load_dotenv()

def load_model():
    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    model_name = os.getenv("LLM_MODEL")
    if provider == "openai":
        m = model_name or "gpt-4o"
        return ChatOpenAI(model=m, temperature=0), {"model": m, "provider": "openai"}
    elif provider == "anthropic":
        m = model_name or "claude-3-5-sonnet-20241022"
        return ChatAnthropic(model=m, temperature=0), {"model": m, "provider": "anthropic"}
    else:
        m = model_name or "llama-3.3-70b-versatile"
        return ChatGroq(model=m, temperature=0), {"model": m, "provider": "groq"}

def load_database(db_url: str):
    return SQLDatabase.from_uri(db_url)

def _escape_braces(text: str) -> str:
    """Escape curly braces in user-supplied text so LangChain's
    prefix.format(dialect=..., top_k=...) doesn't misinterpret them."""
    return text.replace("{", "{{").replace("}", "}}")


def create_agent(model, database, doc_context: str = "", user_context: str = ""):
    # NOTE: LangChain calls `prefix.format(dialect=..., top_k=...)` internally,
    # so the prefix must contain exactly those two placeholders and no other
    # bare { } — otherwise Python raises "unexpected '{' in field name".
    # Any dynamic content (doc_context, user_context) must have its braces escaped.
    prefix = """You are a data assistant with access to SQL database tools.
You are working with a {dialect} database. Limit results to {top_k} rows unless asked otherwise.

Rules:
- Only run SELECT queries. Never INSERT, UPDATE, DELETE, DROP, or any write operation.
- Do not fabricate information. Only answer from tool results.
- If nothing is found, say: I could not find the requested information.
"""
    if user_context:
        prefix += f"\nUser context about this database: {_escape_braces(user_context)}"
    if doc_context:
        prefix += f"\nRelevant document context: {_escape_braces(doc_context)}"

    return create_sql_agent(
        llm=model,
        db=database,
        agent_type="openai-tools",
        prefix=prefix,
        verbose=False,
        handle_parsing_errors=True,
    )

def ask_question(agent, question: str):
    result = agent.invoke({"input": question})
    return result.get("output", "No answer returned.")
