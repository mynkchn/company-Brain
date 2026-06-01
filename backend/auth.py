import os, httpx
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database_models import SessionLocal, User

SECRET = os.getenv("JWT_SECRET", "changeme")
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
ALGO = "HS256"
bearer = HTTPBearer()

def make_token(user_id: int):
    return jwt.encode({"sub": str(user_id), "exp": datetime.utcnow() + timedelta(days=30)}, SECRET, algorithm=ALGO)

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = jwt.decode(creds.credentials, SECRET, algorithms=[ALGO])
        user_id = int(payload["sub"])
    except JWTError:
        raise HTTPException(401, "Invalid token")
    db = SessionLocal()
    user = db.query(User).filter(User.id == user_id).first()
    db.close()
    if not user:
        raise HTTPException(401, "User not found")
    return user

async def github_callback(code: str):
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            json={"client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET, "code": code},
            headers={"Accept": "application/json"}
        )
        access_token = token_res.json().get("access_token")
        user_res = await client.get("https://api.github.com/user", headers={"Authorization": f"Bearer {access_token}"})
        gh = user_res.json()

    db = SessionLocal()
    user = db.query(User).filter(User.github_id == str(gh["id"])).first()
    if not user:
        user = User(github_id=str(gh["id"]), username=gh.get("login"), avatar_url=gh.get("avatar_url"))
        db.add(user)
        db.commit()
        db.refresh(user)
    db.close()
    return make_token(user.id)