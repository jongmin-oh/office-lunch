from collections.abc import Sequence
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Todo
from app.schemas.todos import TodoCreate, TodoUpdate


def _get_own_todo(session: Session, user_id: UUID, todo_id: UUID) -> Todo:
    todo = session.scalar(select(Todo).where(Todo.id == todo_id, Todo.user_id == user_id))
    if todo is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


def list_todos(session: Session, user_id: UUID) -> Sequence[Todo]:
    return session.scalars(select(Todo).where(Todo.user_id == user_id).order_by(Todo.created_at)).all()


def create_todo(session: Session, user_id: UUID, body: TodoCreate) -> Todo:
    todo = Todo(user_id=user_id, title=body.title)
    session.add(todo)
    session.commit()
    return todo


def update_todo(session: Session, user_id: UUID, todo_id: UUID, body: TodoUpdate) -> Todo:
    todo = _get_own_todo(session, user_id, todo_id)
    # null은 '바꾸지 않음'으로 취급한다(보낸 필드 중 값이 있는 것만 반영).
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(todo, field, value)
    session.commit()
    return todo


def delete_todo(session: Session, user_id: UUID, todo_id: UUID) -> None:
    session.delete(_get_own_todo(session, user_id, todo_id))
    session.commit()
