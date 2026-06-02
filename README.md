# CompanyBrain

Natural language interface to your company's SQL databases. Ask plain-English questions, get answers pulled from live database rows — no SQL required. Attach PDFs and internal docs to give the agent extra context.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Workflows](#workflows)
  - [Authentication](#authentication)
  - [Playground Creation](#playground-creation)
  - [Document Ingestion](#document-ingestion)
  - [Ask / Query](#ask--query)
- [Data Models](#data-models)
- [API Reference](#api-reference)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Security](#security)

---

## Overview

CompanyBrain connects a conversational UI to a LangChain SQL agent. The agent inspects the database schema, writes `SELECT` queries, executes them, and returns human-readable answers. Uploaded documents (PDFs, text files) are chunked, embedded locally, and stored in Pinecone — retrieved at query time to enrich the agent's reasoning.

Each user gets isolated **Playgrounds**, each scoped to one database connection and one Pinecone namespace.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Framer Motion, Radix UI |
| Backend | Python, FastAPI, Uvicorn |
| SQL Agent | LangChain `create_sql_agent`, SQLAlchemy |
| LLM Providers | Groq (default), OpenAI, Anthropic — swappable via env var |
| Vector Store | Pinecone serverless (AWS us-east-1) |
| Embeddings | `all-MiniLM-L6-v2`, 384 dims, runs locally |
| Auth | GitHub OAuth 2.0 + JWT (HS256, 30-day expiry) |
| App Database | PostgreSQL via SQLAlchemy |

---

## System Architecture

```mermaid
graph TD
    subgraph Browser["Browser — React SPA"]
        LP[LandingPage]
        DP[DashboardPage]
        PP[PlaygroundPage]
        CI[ChatInterface]
        IP[IngestPanel]
        PP --> CI
        PP --> IP
    end

    subgraph Backend["Backend — FastAPI"]
        AUTH["/auth/*\nGitHub OAuth + JWT"]
        PG["/playground/*\nCRUD"]
        ING["/ingest\nPDF + Text"]
        ASK["/ask\nSQL Agent"]
    end

    subgraph Storage["Storage"]
        PGDB[(PostgreSQL\nusers / playgrounds)]
        PC[(Pinecone\nvector store)]
    end

    subgraph LLM["LLM Layer"]
        direction LR
        GROQ[Groq\nllama-3.3-70b]
        OAI[OpenAI\ngpt-4o]
        ANT[Anthropic\nclaude-3-5-sonnet]
    end

    TARGETDB[(Target Database\nUser's own DB URL)]
    EMB[sentence-transformers\nall-MiniLM-L6-v2]

    LP -->|"GET /auth/login"| AUTH
    DP -->|"Bearer JWT"| PG
    CI -->|"POST /ask"| ASK
    IP -->|"POST /ingest"| ING

    AUTH --> PGDB
    PG --> PGDB
    ING --> EMB --> PC
    ASK --> PC
    ASK --> TARGETDB
    ASK --> GROQ
    ASK -.->|"via LLM_PROVIDER"| OAI
    ASK -.->|"via LLM_PROVIDER"| ANT
```

---

## Workflows

### Authentication

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Backend
    participant GitHub

    User->>Browser: Click "Sign in with GitHub"
    Browser->>Backend: GET /auth/login
    Backend-->>Browser: 302 → GitHub OAuth URL
    Browser->>GitHub: Redirect (client_id, scope=read:user)
    GitHub-->>User: Show approval screen
    User->>GitHub: Approve
    GitHub-->>Backend: GET /auth/callback?code=xxx
    Backend->>GitHub: POST /login/oauth/access_token
    GitHub-->>Backend: access_token
    Backend->>GitHub: GET /user
    GitHub-->>Backend: {id, login, avatar_url}
    Backend->>Backend: Upsert User row
    Backend->>Backend: Sign JWT (HS256, 30d)
    Backend-->>Browser: 302 → /auth?token=JWT
    Browser->>Browser: Store token in localStorage
    Note over Browser,Backend: All subsequent requests carry Authorization: Bearer JWT
```

---

### Playground Creation

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant AppDB as PostgreSQL
    participant TargetDB as Target Database

    User->>Frontend: Fill form (name, db_url, context)
    Frontend->>Backend: POST /playground/new
    Backend->>TargetDB: SQLDatabase.from_uri(db_url).get_table_names()
    alt connection fails
        TargetDB-->>Backend: error
        Backend-->>Frontend: 400 Cannot connect to database
    else connection OK
        TargetDB-->>Backend: table list
        Backend->>Backend: generate uuid4() as namespace
        Backend->>AppDB: INSERT Playground (user_id, name, db_url, namespace, context)
        AppDB-->>Backend: {id, namespace}
        Backend-->>Frontend: {id, name, namespace}
        Frontend->>Frontend: navigate to /playground/:id
    end
```

---

### Document Ingestion

```mermaid
flowchart TD
    A([User uploads file]) --> B{File type?}
    B -->|.pdf| C[PdfReader\nextract all pages text]
    B -->|.txt| D[decode UTF-8]
    C --> E[Raw text string]
    D --> E

    E --> F[RecursiveCharacterTextSplitter\nchunk_size=500  chunk_overlap=50]
    F --> G[List of chunks]

    G --> H[For each chunk]
    H --> I[all-MiniLM-L6-v2\nembed locally\n384-dim vector]
    I --> J["Build record\n{id: namespace-i\n values: vector\n metadata.text: chunk}"]
    J --> K[Pinecone upsert\ninto playground namespace]

    K --> L([Return: ingested count])

    style A fill:#1e293b,color:#e2e8f0
    style L fill:#1e293b,color:#e2e8f0
    style I fill:#0f172a,color:#7dd3fc
    style K fill:#0f172a,color:#7dd3fc
```

---

### Ask / Query

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Backend
    participant Pinecone
    participant TargetDB as Target Database
    participant LLM

    User->>Frontend: Type question
    Frontend->>Backend: POST /ask {question, playground_id}

    Backend->>Backend: Verify JWT, load Playground\n(db_url, namespace, context)

    Backend->>Pinecone: embed(question) → cosine query top_k=4
    Pinecone-->>Backend: top 4 document chunks

    Backend->>TargetDB: SQLDatabase.from_uri(db_url)
    TargetDB-->>Backend: schema / table info

    Backend->>Backend: create_agent()\nBuild system prompt:\n• SELECT only\n• user_context\n• doc_context (RAG)

    Backend->>LLM: agent.invoke({input: question})
    LLM->>LLM: Inspect schema, decide query
    LLM->>TargetDB: Execute SELECT ...
    TargetDB-->>LLM: rows
    LLM->>LLM: Compose natural language answer
    LLM-->>Backend: answer string

    Backend-->>Frontend: {answer, playground}
    Frontend-->>User: Display answer
```

---

## Data Models

```mermaid
erDiagram
    users {
        int     id          PK
        varchar github_id   UK
        varchar username
        varchar avatar_url
        datetime created_at
    }

    playgrounds {
        int     id          PK
        int     user_id     FK
        varchar name
        text    db_url
        varchar namespace
        text    context
        datetime created_at
    }

    users ||--o{ playgrounds : "owns"
```

**Pinecone index layout:**

```
index: sql-agent  (384 dims, cosine)
  |
  +-- namespace: <playground-uuid-A>
  |     +-- <uuid-A>-0   vector[384]   metadata: {text: "..."}
  |     +-- <uuid-A>-1   vector[384]   metadata: {text: "..."}
  |
  +-- namespace: <playground-uuid-B>
        +-- <uuid-B>-0   vector[384]   metadata: {text: "..."}
```

---

## API Reference

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/login` | — | Redirect to GitHub OAuth |
| GET | `/auth/callback?code=` | — | Exchange code, issue JWT |
| GET | `/me` | JWT | Current user profile |

### Playgrounds

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/playground/new` | JWT | Create playground, validates DB connection first |
| GET | `/playground/list` | JWT | List all playgrounds for current user |
| GET | `/playground/:id` | JWT | Get playground details |
| DELETE | `/playground/:id` | JWT | Delete playground + its Pinecone namespace |

### Documents & Queries

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ingest` | JWT | Upload files, chunk, embed, store in Pinecone |
| POST | `/ask` | JWT | Ask question, returns LLM answer |

---

## Local Setup

**Prerequisites:** Python 3.11+, Node.js 18+, pnpm, PostgreSQL, Pinecone account, GitHub OAuth App, one LLM API key.

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in values
python app.py          # http://localhost:5000
```

### Frontend

```bash
cd frontend
pnpm install
echo "VITE_API_URL=http://localhost:5000" > .env.local
pnpm dev               # http://localhost:5173
```

### GitHub OAuth App

Go to GitHub > Settings > Developer settings > OAuth Apps > New OAuth App:

- Homepage URL: `http://localhost:5173`
- Authorization callback URL: `http://localhost:5000/auth/callback`

Copy the Client ID and Secret into your `.env`.

---

## Environment Variables

```dotenv
# App database
DATABASE_URL=postgresql://user:pass@localhost:5432/companybrain

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# JWT
JWT_SECRET=change_this_to_a_long_random_string

# LLM — options: groq | openai | anthropic
LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile   # optional, uses provider default if omitted

# API keys — only the one matching LLM_PROVIDER is needed
GROQ_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX=sql-agent            # auto-created on first run

# Frontend origin
FRONTEND_URL=http://localhost:5173
```

---

## Project Structure

```
company-Brain/
|
+-- backend/
|   +-- app.py               route handlers, FastAPI app
|   +-- SQLAgent.py          load_model, create_agent, ask_question
|   +-- vectordb.py          Pinecone upsert, retrieve, delete
|   +-- auth.py              GitHub OAuth, JWT sign/verify
|   +-- database_models.py   SQLAlchemy ORM: User, Playground
|   +-- prompt.py            system prompt helper
|   +-- requirements.txt
|   +-- test_endpoints.py    integration tests
|
+-- frontend/
    +-- src/
    |   +-- App.tsx                  root router + auth guard
    |   +-- pages/
    |   |   +-- LandingPage.tsx      login page
    |   |   +-- AuthCallbackPage.tsx reads JWT from URL param
    |   |   +-- DashboardPage.tsx    list/delete playgrounds
    |   |   +-- NewPlaygroundPage.tsx create playground form
    |   |   +-- PlaygroundPage.tsx   chat + ingest workspace
    |   +-- components/
    |   |   +-- ChatInterface.tsx    message thread + input
    |   |   +-- IngestPanel.tsx      file upload + context editor
    |   |   +-- ui/                  Radix UI wrappers
    |   +-- services/
    |   |   +-- api.ts               Axios client, all service calls
    |   +-- hooks/
    |       +-- useAuth.ts           user state, logout
    +-- package.json
    +-- vite.config.ts
```

---

## Security

| Concern | Mechanism |
|---|---|
| Login | GitHub OAuth — no passwords stored |
| Sessions | JWT HS256, 30-day expiry |
| Authorisation | All DB queries filter by `user_id = current_user.id` |
| SQL safety | System prompt forbids `INSERT`, `UPDATE`, `DELETE`, `DROP` |
| Data isolation | Each playground has a unique Pinecone namespace |
| CORS | Set to `*` for dev — restrict to your frontend domain in production |
