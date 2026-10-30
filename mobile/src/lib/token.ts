import { Capacitor } from "@capacitor/core";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

const key = "access_token";
// Native credentials stay in Keychain/Keystore. Web sessions end when the tab closes.
export const tokenStorage = {
  async get(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return sessionStorage.getItem(key);
    const value = await SecureStorage.get(key);
    return typeof value === "string" ? value : null;
  },
  async set(token: string) {
    if (Capacitor.isNativePlatform()) await SecureStorage.set(key, token);
    else sessionStorage.setItem(key, token);
  },
  async remove() {
    if (Capacitor.isNativePlatform()) await SecureStorage.remove(key);
    else sessionStorage.removeItem(key);
  },
};
