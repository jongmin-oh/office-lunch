import { authedFetch } from "@/lib/http";
import type { components } from "@/lib/schema";

export type Todo = components["schemas"]["Todo"];
type TodoCreate = components["schemas"]["TodoCreate"];
type TodoUpdate = components["schemas"]["TodoUpdate"];

export async function listTodos(): Promise<Todo[]> {
  return (await authedFetch("/todos", { method: "GET" })).json();
}

export async function createTodo(title: string): Promise<Todo> {
  const body: TodoCreate = { title };
  return (await authedFetch("/todos", { method: "POST", body })).json();
}

export async function updateTodo(id: string, patch: TodoUpdate): Promise<Todo> {
  return (
    await authedFetch(`/todos/${id}`, { method: "PATCH", body: patch })
  ).json();
}

export async function deleteTodo(id: string): Promise<void> {
  await authedFetch(`/todos/${id}`, { method: "DELETE" });
}
