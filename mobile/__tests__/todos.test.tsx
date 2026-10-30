import { StrictMode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "@/app/App";
import { tokenStorage } from "@/lib/token";
import type { components } from "@/lib/schema";

vi.mock("@/lib/token", () => ({
  tokenStorage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
}));
vi.mock("@/features/auth/google", () => ({
  googleSignIn: vi.fn(),
  googleSignOut: vi.fn(),
}));
type Todo = components["schemas"]["Todo"];
const user: components["schemas"]["User"] = {
  id: "u1",
  email: "a@example.com",
  name: "Alice",
};
const milk: Todo = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "milk",
  done: false,
  created_at: "2026-01-01T00:00:00Z",
};
const eggs: Todo = {
  id: "22222222-2222-2222-2222-222222222222",
  title: "eggs",
  done: true,
  created_at: "2026-01-02T00:00:00Z",
};

let server: Todo[];
let failPatch: boolean;
let failList: boolean;
const fetchMock = vi.fn();
function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function requests(method: string) {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === method);
}
beforeEach(() => {
  vi.resetAllMocks();
  server = [];
  failPatch = false;
  failList = false;
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(tokenStorage.get).mockResolvedValue("saved-token");
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (url.endsWith("/me")) return json(200, user);
    if (url.endsWith("/todos") && method === "GET") {
      return failList ? json(500, { detail: "boom" }) : json(200, server);
    }
    if (url.endsWith("/todos") && method === "POST") {
      const todo = { ...milk, id: `new-${server.length}`, title: body.title };
      server = [...server, todo];
      return json(201, todo);
    }
    const id = url.split("/todos/")[1];
    if (method === "PATCH") {
      if (failPatch) return json(500, { detail: "boom" });
      server = server.map((t) => (t.id === id ? { ...t, ...body } : t));
      return json(200, server.find((t) => t.id === id));
    }
    if (method === "DELETE") {
      server = server.filter((t) => t.id !== id);
      return json(204);
    }
    return json(404, {});
  });
});
function renderTodos() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
  return userEvent.setup();
}

test("lists the user's todos with their done state", async () => {
  server = [milk, eggs];
  renderTodos();
  expect(await screen.findByRole("checkbox", { name: "milk" })).not.toBeChecked();
  expect(screen.getByRole("checkbox", { name: "eggs" })).toBeChecked();
  expect(screen.getByText("eggs")).toHaveClass("line-through", "text-muted");
  expect(screen.getByText("milk")).not.toHaveClass("line-through");
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/todos$/),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer saved-token" }),
    }),
  );
});

test("shows an empty state", async () => {
  renderTodos();
  expect(await screen.findByText("할 일이 없어요")).toBeVisible();
});

test("shows an error when the list cannot load", async () => {
  fetchMock.mockImplementation(async (url: string) =>
    url.endsWith("/me") ? json(200, user) : json(500, { detail: "boom" }),
  );
  renderTodos();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "할 일을 불러오지 못했어요",
  );
});

test("adds a todo with Enter, clears the input, and keeps add disabled when blank", async () => {
  const ui = renderTodos();
  const input = await screen.findByRole("textbox", { name: "할 일" });
  const add = screen.getByRole("button", { name: "추가" });
  expect(add).toBeDisabled();
  await ui.type(input, "   ");
  expect(add).toBeDisabled();
  await ui.clear(input);
  await ui.type(input, "milk{Enter}");
  expect(await screen.findByRole("checkbox", { name: "milk" })).toBeVisible();
  expect(input).toHaveValue("");
  expect(requests("POST")[0][1].body).toBe(JSON.stringify({ title: "milk" }));
});

test("toggling sends done and shows the done style", async () => {
  server = [milk];
  const ui = renderTodos();
  await ui.click(await screen.findByRole("checkbox", { name: "milk" }));
  await waitFor(() =>
    expect(screen.getByText("milk")).toHaveClass("line-through", "text-muted"),
  );
  const [url, init] = requests("PATCH")[0];
  expect(url).toMatch(new RegExp(`/todos/${milk.id}$`));
  expect(init.body).toBe(JSON.stringify({ done: true }));
  expect(screen.getByRole("checkbox", { name: "milk" })).toBeChecked();
});

test("deleting removes the row", async () => {
  server = [milk, eggs];
  const ui = renderTodos();
  await ui.click(await screen.findByRole("button", { name: "milk 삭제" }));
  await waitFor(() =>
    expect(screen.queryByRole("checkbox", { name: "milk" })).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("checkbox", { name: "eggs" })).toBeVisible();
  expect(requests("DELETE")).toHaveLength(1);
});

test("a failed toggle rolls back", async () => {
  server = [milk];
  const ui = renderTodos();
  const checkbox = await screen.findByRole("checkbox", { name: "milk" });
  failPatch = true;
  failList = true;
  await ui.click(checkbox);
  await waitFor(() => expect(requests("PATCH")).toHaveLength(1));
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: "milk" })).not.toBeChecked(),
  );
  expect(screen.getByText("milk")).not.toHaveClass("line-through");
});

test("the nav item is labelled 할 일", async () => {
  renderTodos();
  expect(await screen.findByRole("link", { name: "할 일" })).toBeVisible();
});
