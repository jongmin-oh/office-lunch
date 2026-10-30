import { beforeEach, expect, test, vi } from "vitest";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { googleSignIn, googleSignOut } from "@/features/auth/google";

vi.mock("@capgo/capacitor-social-login", () => ({
  SocialLogin: { initialize: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(SocialLogin.initialize).mockResolvedValue(undefined);
});
test("Google bridge returns the online ID token for backend exchange", async () => {
  vi.mocked(SocialLogin.login).mockResolvedValue({
    provider: "google",
    result: {
      responseType: "online",
      idToken: "google-id-token",
      accessToken: null,
      profile: {
        email: "a@example.com",
        familyName: null,
        givenName: "Alice",
        id: "u1",
        name: "Alice",
        imageUrl: null,
      },
    },
  });
  expect(await googleSignIn()).toBe("google-id-token");
  expect(SocialLogin.initialize).toHaveBeenCalledWith({
    google: expect.objectContaining({ mode: "online" }),
  });
  expect(SocialLogin.login).toHaveBeenCalledWith({
    provider: "google",
    options: {},
  });
  await googleSignIn();
  expect(SocialLogin.initialize).toHaveBeenCalledOnce();
});
test("Capacitor cancellation objects leave the app signed out", async () => {
  vi.mocked(SocialLogin.login).mockRejectedValue({
    code: "USER_CANCELLED",
    message: "사용자가 닫음",
  });
  expect(await googleSignIn()).toBeNull();
});
test("actual provider errors are not mistaken for cancellation", async () => {
  vi.mocked(SocialLogin.login).mockRejectedValue(
    new Error("Invalid client ID"),
  );
  await expect(googleSignIn()).rejects.toThrow("Invalid client ID");
});
test("logout is forwarded to the Google provider", async () => {
  await googleSignOut();
  expect(SocialLogin.logout).toHaveBeenCalledWith({ provider: "google" });
});
