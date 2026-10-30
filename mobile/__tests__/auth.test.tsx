import { StrictMode } from "react";
import { beforeEach, expect, test, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "@/app/App";
import { tokenStorage } from "@/lib/token";
import { googleSignIn, googleSignOut } from "@/features/auth/google";
import type { components } from "@/lib/schema";

vi.mock("@/lib/token", () => ({
  tokenStorage: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
}));
vi.mock("@/features/auth/google", () => ({
  googleSignIn: vi.fn(),
  googleSignOut: vi.fn(),
}));
const user: components["schemas"]["User"] = {
  id: "u1",
  email: "a@example.com",
  name: "Alice",
};
const login: components["schemas"]["LoginResponse"] = {
  access_token: "server-token",
  user,
};
const fetchMock = vi.fn();
function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}
function renderApp(path = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
  return userEvent.setup();
}
function signedIn(path = "/") {
  vi.mocked(tokenStorage.get).mockResolvedValue("saved-token");
  respond(200, user);
  return renderApp(path);
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", fetchMock);
  vi.mocked(tokenStorage.get).mockResolvedValue(null);
  vi.mocked(googleSignIn).mockResolvedValue("mockIdToken");
  document.documentElement.dataset.theme = "system";
});
test("protected routes show sign-in without a stored token", async () => {
  renderApp("/my");
  expect(
    await screen.findByRole("button", { name: "Google로 로그인" }),
  ).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});
test("restores session with the generated /me contract", async () => {
  signedIn();
  expect(await screen.findByRole("heading", { name: "할 일" })).toBeVisible();
  expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/me$/), {
    headers: { Authorization: "Bearer saved-token" },
  });
});
test("expired token is removed", async () => {
  vi.mocked(tokenStorage.get).mockResolvedValue("expired-token");
  respond(401, { detail: "Invalid token" });
  renderApp();
  expect(
    await screen.findByRole("button", { name: "Google로 로그인" }),
  ).toBeVisible();
  expect(tokenStorage.remove).toHaveBeenCalledOnce();
});
test("Google sign-in exchanges id_token and stores the server token", async () => {
  respond(200, login);
  const ui = renderApp();
  await ui.click(
    await screen.findByRole("button", { name: "Google로 로그인" }),
  );
  expect(await screen.findByRole("heading", { name: "할 일" })).toBeVisible();
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/auth\/google$/),
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ id_token: "mockIdToken" }),
    }),
  );
  expect(tokenStorage.set).toHaveBeenCalledWith("server-token");
});
test("cancelled Google sign-in does not call the backend", async () => {
  vi.mocked(googleSignIn).mockResolvedValue(null);
  const ui = renderApp();
  await ui.click(
    await screen.findByRole("button", { name: "Google로 로그인" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Google로 로그인" }),
    ).toBeEnabled(),
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
test("rejected login stays signed out", async () => {
  respond(401, { detail: "Invalid token" });
  const ui = renderApp();
  await ui.click(
    await screen.findByRole("button", { name: "Google로 로그인" }),
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "Google로 로그인" })).toBeVisible();
  expect(tokenStorage.set).not.toHaveBeenCalled();
});
test("logout modal can be cancelled", async () => {
  const ui = signedIn("/my");
  expect(await screen.findByText("a@example.com")).toBeVisible();
  await ui.click(screen.getByRole("button", { name: "로그아웃" }));
  await ui.click(screen.getByRole("button", { name: "취소" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(googleSignOut).not.toHaveBeenCalled();
  expect(tokenStorage.remove).not.toHaveBeenCalled();
});
test("confirmed logout clears credentials and protected screens", async () => {
  const ui = signedIn("/my");
  await ui.click(await screen.findByRole("button", { name: "로그아웃" }));
  await ui.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "로그아웃",
    }),
  );
  expect(
    await screen.findByRole("button", { name: "Google로 로그인" }),
  ).toBeVisible();
  expect(tokenStorage.remove).toHaveBeenCalledOnce();
  expect(googleSignOut).toHaveBeenCalledOnce();
});
test("theme selector updates document data-theme", async () => {
  const ui = signedIn("/my");
  const select = await screen.findByLabelText("테마");
  await ui.selectOptions(select, "dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
});
