import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, false, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Todo(Base):
    __tablename__ = "todos"
    __table_args__ = (Index("todos_user_id_idx", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=func.gen_random_uuid())
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", name="todos_user_id_fkey"))
    title: Mapped[str] = mapped_column(String(200))
    done: Mapped[bool] = mapped_column(server_default=false())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
