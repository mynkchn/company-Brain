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
    # FIX 1: Much richer prefix that encourages exploration and using doc context
    prefix = """You are an expert data analyst with access to a {dialect} database.
You can query up to {top_k} rows by default, but ask for more if needed.

IMPORTANT RULES:
- ALWAYS use the sql_db_list_tables tool first to discover available tables.
- ALWAYS use sql_db_schema to understand table structure before querying.
- Only run SELECT queries. Never INSERT, UPDATE, DELETE, DROP, or any write operation.
- If a query returns no rows, try alternative column names or relaxed filters before giving up.
- Use the document context below to understand business terminology, column meanings, and domain knowledge.
- Be thorough: if one approach fails, try a different query strategy.
- Provide clear, human-readable answers with the data found.
- Only say you cannot find information after genuinely trying multiple query approaches.
"""
    if user_context:
        prefix += f"\n=== DATABASE CONTEXT ===\n{_escape_braces(user_context)}\n"
    if doc_context:
        prefix += f"\n=== RELEVANT DOCUMENT KNOWLEDGE ===\n{_escape_braces(doc_context)}\n"

    prefix += "\nNow answer the user's question using the tools available to you."

    # FIX 2: Determine agent_type based on provider for compatibility
    provider = os.getenv("LLM_PROVIDER", "groq").lower()
    # openai-tools works with OpenAI and compatible APIs; use "tool-calling" for others
    agent_type = "openai-tools" if provider == "openai" else "tool-calling"

    return create_sql_agent(
        llm=model,
        db=database,
        agent_type=agent_type,
        prefix=prefix,
        verbose=True,       # FIX 3: Enable verbose for better debugging
        handle_parsing_errors=True,
        max_iterations=15,  # FIX 4: Increase from default 6 — complex queries need more steps
        max_execution_time=60,
    )

def ask_question(agent, question: str):
    result = agent.invoke({"input": question})
    return result.get("output", "No answer returned.")
