import { API_URL } from "@/lib/http";
import type { components } from "@/lib/schema";

type User = components["schemas"]["User"];
type LoginResponse = components["schemas"]["LoginResponse"];
type GoogleLoginRequest = components["schemas"]["GoogleLoginRequest"];

export async function loginWithGoogle(
  idToken: string,
): Promise<LoginResponse | null> {
  const body: GoogleLoginRequest = { id_token: idToken };
  const res = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getMe(accessToken: string): Promise<User | null> {
  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}
