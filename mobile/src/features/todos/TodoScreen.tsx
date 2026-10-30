import { useState } from "react";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useTodos } from "./useTodos";

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-icon-source="lucide"
      className="lucide lucide-trash-2"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

export function TodoScreen() {
  const [title, setTitle] = useState("");
  const { todos, isPending, add, toggle, remove } = useTodos();

  return (
    <Screen title="할 일">
      <form
        className="flex items-end gap-3 border-b border-line p-4"
        onSubmit={(event) => {
          event.preventDefault();
          add.mutate(title, { onSuccess: () => setTitle("") });
        }}
      >
        <div className="flex-1">
          <label htmlFor="todo-title" className="block text-sm font-semibold">
            할 일
          </label>
          <input
            id="todo-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            className="mt-2 min-h-12 w-full rounded-lg border border-line bg-canvas px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
        </div>
        <Button type="submit" title="추가" disabled={!title.trim() || add.isPending} />
      </form>
      {add.isError && (
        <p role="alert" className="px-4 pt-3 text-sm text-muted">
          추가하지 못했어요
        </p>
      )}
      {isPending ? (
        <p role="status" className="p-4 text-sm text-muted">
          불러오는 중…
        </p>
      ) : !todos ? (
        <p role="alert" className="p-4 text-sm text-muted">
          할 일을 불러오지 못했어요
        </p>
      ) : todos.length === 0 ? (
        <p className="p-4 text-sm text-muted">할 일이 없어요</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id} className="flex items-center border-b border-line">
              <label className="flex min-h-12 flex-1 items-center gap-3 p-4">
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={(event) =>
                    toggle.mutate({ id: todo.id, done: event.target.checked })
                  }
                  className="size-5 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                />
                <span
                  className={`text-base ${todo.done ? "text-muted line-through" : "text-ink"}`}
                >
                  {todo.title}
                </span>
              </label>
              <button
                type="button"
                aria-label={`${todo.title} 삭제`}
                onClick={() => remove.mutate(todo.id)}
                className="flex min-h-12 min-w-12 items-center justify-center text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
