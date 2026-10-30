const key = "access_token";
// Web sessions end when the tab closes.
export const tokenStorage = {
  async get(): Promise<string | null> {
    return sessionStorage.getItem(key);
  },
  async set(token: string) {
    sessionStorage.setItem(key, token);
  },
  async remove() {
    sessionStorage.removeItem(key);
  },
};
