import re
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.db import db
from app.core.security import HASH_ALGORITHM, hash_password, new_token, verify_password
from app.models import SessionToken, User

router = APIRouter(prefix="/api/auth", tags=["auth"])

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.-]+$")


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    display_name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8, max_length=256)
    chesscom_username: str | None = Field(default=None, max_length=80)
    email: str | None = Field(default=None, max_length=254)

    @field_validator("username")
    @classmethod
    def clean_username(cls, value):
        value = value.strip().lower()
        if not USERNAME_RE.fullmatch(value):
            raise ValueError("Kullanici adi yalnizca harf, rakam, nokta, tire ve alt cizgi icerebilir.")
        return value

    @field_validator("display_name")
    @classmethod
    def clean_display_name(cls, value):
        return " ".join(value.split())

    @field_validator("email")
    @classmethod
    def clean_email(cls, value):
        if value is None or value.strip() == "":
            return None
        value = value.strip().lower()
        if "@" not in value or "." not in value.rsplit("@", 1)[-1]:
            raise ValueError("Gecerli bir e-posta adresi gir.")
        return value

    @field_validator("chesscom_username")
    @classmethod
    def clean_chesscom_username(cls, value):
        if value is None or value.strip() == "":
            return None
        return value.strip()


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)

    @field_validator("username")
    @classmethod
    def clean_username(cls, value):
        return value.strip().lower()


def public_user(user):
    return {
        "id": user.id,
        "username": user.username,
        "displayName": user.display_name,
        "chesscomUsername": user.chesscom_username,
        "email": user.email,
    }


def extract_token(
    token: str | None = Query(default=None),
    authorization: str | None = Header(default=None),
    x_session_token: str | None = Header(default=None),
):
    if x_session_token:
        return x_session_token.strip()

    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value.strip():
            return value.strip()

    return token


def get_current_user(token: str | None):
    if not token:
        raise HTTPException(status_code=401, detail="Oturum gerekli.")

    with db() as session:
        session_token = session.get(SessionToken, token)
        if session_token is None:
            raise HTTPException(status_code=401, detail="Oturum bulunamadi.")

        session_token.last_seen_at = datetime.now(timezone.utc)
        return session.get(User, session_token.user_id)


@router.post("/register")
def register(payload: RegisterRequest):
    with db() as session:
        try:
            user = User(
                email=payload.email,
                username=payload.username,
                display_name=payload.display_name,
                password_hash=hash_password(payload.password),
                chesscom_username=payload.chesscom_username,
            )
            session.add(user)
            session.flush()
        except IntegrityError:
            raise HTTPException(status_code=409, detail="Kullanici adi veya e-posta zaten kayitli.")

        token = new_token()
        session.add(SessionToken(token=token, user_id=user.id))
        session.flush()
        return {"token": token, "user": public_user(user)}


@router.post("/login")
def login(payload: LoginRequest):
    with db() as session:
        user = session.execute(
            select(User).where(User.username == payload.username)
        ).scalar_one_or_none()

        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Kullanici adi veya sifre hatali.")

        if not user.password_hash.startswith(f"{HASH_ALGORITHM}$"):
            user.password_hash = hash_password(payload.password)

        token = new_token()
        session.add(SessionToken(token=token, user_id=user.id))
        session.flush()
        return {"token": token, "user": public_user(user)}


@router.get("/me")
def me(
    token: str | None = Query(default=None),
    authorization: str | None = Header(default=None),
    x_session_token: str | None = Header(default=None),
):
    user = get_current_user(extract_token(token, authorization, x_session_token))
    return {"user": public_user(user)}


@router.post("/logout")
def logout(
    token: str | None = Query(default=None),
    authorization: str | None = Header(default=None),
    x_session_token: str | None = Header(default=None),
):
    session_token = extract_token(token, authorization, x_session_token)
    if not session_token:
        return {"status": "ok"}

    with db() as session:
        token_row = session.get(SessionToken, session_token)
        if token_row is not None:
            session.delete(token_row)
    return {"status": "ok"}
