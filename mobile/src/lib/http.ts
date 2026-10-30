import { tokenStorage } from "@/lib/token";

export const API_URL = import.meta.env.VITE_API_URL ?? "/api";

export async function authedFetch(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<Response> {
  const token = await tokenStorage.get();
  if (!token) throw new Error("Not signed in");
  const { body, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} failed: ${res.status}`);
  return res;
}
