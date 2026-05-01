from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str | None] = mapped_column(String(254), unique=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(512))
    chesscom_username: Mapped[str | None] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sessions: Mapped[list["SessionToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class SessionToken(Base):
    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="sessions")


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_username: Mapped[str] = mapped_column(String(80), index=True)
    chesscom_url: Mapped[str | None] = mapped_column(String(500), unique=True)
    pgn: Mapped[str] = mapped_column(Text)
    white_username: Mapped[str | None] = mapped_column(String(120))
    black_username: Mapped[str | None] = mapped_column(String(120))
    user_color: Mapped[str | None] = mapped_column(String(16))
    result: Mapped[str | None] = mapped_column(String(32))
    time_class: Mapped[str | None] = mapped_column(String(32))
    time_control: Mapped[str | None] = mapped_column(String(64))
    eco_url: Mapped[str | None] = mapped_column(String(500))
    end_time: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    moves: Mapped[list["Move"]] = relationship(back_populates="game", cascade="all, delete-orphan")


class Move(Base):
    __tablename__ = "moves"
    __table_args__ = (UniqueConstraint("game_id", "ply", name="uq_moves_game_ply"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), index=True)
    ply: Mapped[int] = mapped_column(Integer)
    move_number: Mapped[int] = mapped_column(Integer)
    side: Mapped[str] = mapped_column(String(16))
    san: Mapped[str] = mapped_column(String(32))
    uci: Mapped[str] = mapped_column(String(8))
    fen_before: Mapped[str] = mapped_column(String(120))
    fen_after: Mapped[str] = mapped_column(String(120))
    phase: Mapped[str] = mapped_column(String(24))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    game: Mapped[Game] = relationship(back_populates="moves")
    analysis: Mapped["Analysis | None"] = relationship(back_populates="move", cascade="all, delete-orphan", uselist=False)


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    move_id: Mapped[int] = mapped_column(ForeignKey("moves.id", ondelete="CASCADE"), unique=True, index=True)
    depth: Mapped[int] = mapped_column(Integer)
    passes: Mapped[int] = mapped_column(Integer)
    eval_before_cp: Mapped[float | None] = mapped_column(Float)
    eval_after_cp: Mapped[float | None] = mapped_column(Float)
    best_move_uci: Mapped[str | None] = mapped_column(String(8))
    loss_cp: Mapped[float | None] = mapped_column(Float)
    quality: Mapped[str | None] = mapped_column(String(32))
    quality_label: Mapped[str | None] = mapped_column(String(64))
    confidence: Mapped[float | None] = mapped_column(Float)
    explanation: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    move: Mapped[Move] = relationship(back_populates="analysis")


class SavedPuzzle(Base):
    __tablename__ = "saved_puzzles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    game_id: Mapped[int | None] = mapped_column(ForeignKey("games.id", ondelete="SET NULL"))
    move_id: Mapped[int | None] = mapped_column(ForeignKey("moves.id", ondelete="SET NULL"))
    title: Mapped[str | None] = mapped_column(String(120))
    fen: Mapped[str] = mapped_column(String(120))
    best_move: Mapped[str | None] = mapped_column(String(8))
    quality: Mapped[str | None] = mapped_column(String(32))
    due_at: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SavedVariation(Base):
    __tablename__ = "saved_variations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    game_id: Mapped[int | None] = mapped_column(ForeignKey("games.id", ondelete="SET NULL"))
    root_ply: Mapped[int | None] = mapped_column(Integer)
    title: Mapped[str | None] = mapped_column(String(120))
    line_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
