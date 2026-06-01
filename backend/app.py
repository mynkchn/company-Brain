import os, uuid
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Optional
from pypdf import PdfReader
import io

from SQLAgent import load_model, load_database, create_agent, ask_question
from vectordb import upsert_documents, retrieve_context, delete_namespace

from auth import get_current_user, github_callback, GITHUB_CLIENT_ID
from database_models import SessionLocal, User, Playground

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

model, model_info = load_model()

class AskRequest(BaseModel):
    question: str
    playground_id: int

class PlaygroundCreate(BaseModel):
    name: str
    db_url: str
    context: Optional[str] = ""

@app.get("/auth/login")
def login():
    return RedirectResponse(f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&scope=read:user")

@app.get("/auth/callback")
async def callback(code: str):
    token = await github_callback(code)
    frontend = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(f"{frontend}/auth?token={token}")

@app.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "username": user.username, "avatar_url": user.avatar_url}

@app.post("/playground/new")
def new_playground(data: PlaygroundCreate, user: User = Depends(get_current_user)):
    try:
        load_database(data.db_url).get_table_names()
    except Exception as e:
        raise HTTPException(400, f"Cannot connect to database: {e}")
    db = SessionLocal()
    pg = Playground(user_id=user.id, name=data.name, db_url=data.db_url,
                    namespace=str(uuid.uuid4()), context=data.context)
    db.add(pg)
    db.commit()
    db.refresh(pg)
    db.close()
    return {"id": pg.id, "name": pg.name, "namespace": pg.namespace}

@app.get("/playground/list")
def list_playgrounds(user: User = Depends(get_current_user)):
    db = SessionLocal()
    pgs = db.query(Playground).filter(Playground.user_id == user.id).all()
    db.close()
    return [{"id": p.id, "name": p.name, "created_at": p.created_at} for p in pgs]

@app.get("/playground/{pg_id}")
def get_playground(pg_id: int, user: User = Depends(get_current_user)):
    db = SessionLocal()
    pg = db.query(Playground).filter(Playground.id == pg_id, Playground.user_id == user.id).first()
    db.close()
    if not pg:
        raise HTTPException(404, "Playground not found")
    return {"id": pg.id, "name": pg.name, "context": pg.context, "created_at": pg.created_at}

@app.delete("/playground/{pg_id}")
def delete_playground(pg_id: int, user: User = Depends(get_current_user)):
    db = SessionLocal()
    pg = db.query(Playground).filter(Playground.id == pg_id, Playground.user_id == user.id).first()
    if not pg:
        db.close()
        raise HTTPException(404, "Not found")
    try:
        delete_namespace(pg.namespace)
    except:
        pass
    db.delete(pg)
    db.commit()
    db.close()
    return {"deleted": True}

@app.post("/ingest")
async def ingest(
    playground_id: int = Form(...),
    context: str = Form(""),
    files: List[UploadFile] = File(default=[]),
    user: User = Depends(get_current_user)
):
    db = SessionLocal()
    pg = db.query(Playground).filter(Playground.id == playground_id, Playground.user_id == user.id).first()
    if not pg:
        db.close()
        raise HTTPException(404, "Playground not found")
    if context:
        pg.context = context
        db.commit()
    db.close()

    texts = []
    for f in files:
        content = await f.read()
        if f.filename.endswith(".pdf"):
            reader = PdfReader(io.BytesIO(content))
            texts.append("\n".join(p.extract_text() or "" for p in reader.pages))
        else:
            texts.append(content.decode("utf-8", errors="ignore"))

    if texts:
        upsert_documents(texts, pg.namespace)
    return {"ingested": len(texts), "namespace": pg.namespace}

@app.post("/ask")
async def ask(req: AskRequest, user: User = Depends(get_current_user)):
    db = SessionLocal()
    pg = db.query(Playground).filter(Playground.id == req.playground_id, Playground.user_id == user.id).first()
    db.close()
    if not pg:
        raise HTTPException(404, "Playground not found")
    try:
        database = load_database(pg.db_url)
        doc_context = retrieve_context(req.question, pg.namespace)
        agent = create_agent(model, database, doc_context=doc_context, user_context=pg.context or "")
        answer = ask_question(agent, req.question)
        return {"answer": answer, "playground": pg.name}
    except Exception as e:
        raise HTTPException(500, str(e))

@app.get("/")
def root():
    return {"status": "ok", "model": model_info}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", port=5000, reload=True)