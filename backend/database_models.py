from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

Base = declarative_base()
engine = create_engine(
    os.getenv('DATABASE_URL'),
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=5,
    max_overflow=10,
)
SessionLocal = sessionmaker(bind=engine,autocommit=False,autoflush=False,expire_on_commit=False)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(String, unique=True, index=True)
    username = Column(String)
    avatar_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class Playground(Base):
    __tablename__ = "playgrounds"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    db_url = Column(Text)
    namespace = Column(String)
    context = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)
