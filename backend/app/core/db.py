from __future__ import annotations

from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import DATABASE_URL, IS_SQLITE
from app.models import Base

ENGINE_KWARGS = {"pool_pre_ping": True}
if IS_SQLITE:
    ENGINE_KWARGS["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **ENGINE_KWARGS)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


@contextmanager
def db():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def migrate():
    Base.metadata.create_all(bind=engine)

    if IS_SQLITE:
        with engine.begin() as connection:
            connection.execute(text("PRAGMA foreign_keys = ON"))
            connection.execute(text("PRAGMA journal_mode = WAL"))
            connection.execute(text("PRAGMA synchronous = NORMAL"))
            connection.execute(text("PRAGMA busy_timeout = 5000"))


def scalar(session: Session, statement):
    return session.execute(statement).scalar_one_or_none()
