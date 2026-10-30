import { SocialLogin } from "@capgo/capacitor-social-login";

let initialization: Promise<void> | undefined;
function initialize() {
  initialization ??= SocialLogin.initialize({
    google: {
      webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
      iOSClientId: import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID,
      iOSServerClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
      mode: "online",
    },
  });
  return initialization;
}

export async function googleSignIn(): Promise<string | null> {
  await initialize();
  try {
    const { result } = await SocialLogin.login({
      provider: "google",
      options: {},
    });
    return "idToken" in result ? result.idToken : null;
  } catch (error) {
    // Capacitor may reject with a plain object instead of an Error instance.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "USER_CANCELLED"
    )
      return null;
    // Retain cancellation support for providers returning only a message.
    if (error instanceof Error && /cancel|dismiss/i.test(error.message))
      return null;
    throw error;
  }
}

export async function googleSignOut() {
  await initialize();
  await SocialLogin.logout({ provider: "google" });
}
