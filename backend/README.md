# sql-agent

Talk to your database in plain English. Point it at any SQL database, pick your LLM, and ask questions.

Built on LangChain + LangGraph + FastAPI. Works with OpenAI, Anthropic, and Groq out of the box.

---

## Setup

```bash
git clone https://github.com/your-username/sql-agent.git
cd sql-agent
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill it in:

```env
LLM_PROVIDER=groq          # openai | anthropic | groq
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

DATABASE_URL=postgresql://user:password@host:5432/mydb
```

Then run:

```bash
python app.py
```

API is at `http://localhost:5000`. Swagger UI at `/docs`.

---

## Usage

**Ask a question:**
```bash
curl -X POST http://localhost:5000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "which customers placed the most orders last month?"}'
```

**Check what tables are available:**
```bash
curl http://localhost:5000/database
```

**Check agent/model info:**
```bash
curl http://localhost:5000/
```

---

## Connecting a different database

Set `DATABASE_URL` in `.env` to any SQLAlchemy connection string:

```
# SQLite
sqlite:///./local.db

# MySQL
mysql+pymysql://user:pass@host:3306/dbname

# PostgreSQL
postgresql://user:pass@host:5432/dbname

# MSSQL
mssql+pyodbc://user:pass@host/dbname?driver=ODBC+Driver+17+for+SQL+Server
```

---

## Switching models

Change `LLM_PROVIDER` in `.env`. Defaults are:

| Provider  | Default model                   |
|-----------|---------------------------------|
| groq      | llama3-70b-8192                 |
| openai    | gpt-4o                          |
| anthropic | claude-3-5-sonnet-20241022      |

To use a specific model, add `LLM_MODEL=model-name` to `.env`.

---

## Customising the prompt

Edit `prompt.py` to give the agent context about your schema, domain, or how you want answers formatted. The more you describe your tables and what they mean, the better the results.

```python
def GetPrompt(database):
    return f"""
    You are a data assistant for [your company/context here].
    Database dialect: {database.dialect}
    Access is read-only.

    [Describe your tables, key relationships, anything the model should know]
    """
```

---

## Files

```
SQLAgent.py   — model loader, agent setup, ask()
app.py        — FastAPI routes
prompt.py     — system prompt (edit this for your use case)
db.py         — database connection
render.yaml   — deploy to Render
```

---

## Deployment

**Render:** push to GitHub, connect the repo in the Render dashboard, set env vars in the service settings.

**Docker:**
```bash
docker build -t sql-agent .
docker run -p 5000:5000 --env-file .env sql-agent
```

---

## Notes

- Agent only runs `SELECT` queries. It can't write, update, or delete data.
- Don't expose this publicly without adding auth. There's no authentication layer built in.
- Don't commit `.env` to source control.
