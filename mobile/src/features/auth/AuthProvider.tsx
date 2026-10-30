import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@/lib/schema";
import { tokenStorage } from "@/lib/token";
import { getMe, loginWithGoogle } from "./api";
import { googleSignIn, googleSignOut } from "./google";

type User = components["schemas"]["User"];
type Auth = {
  user: User | null;
  loading: boolean;
  signingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<Auth | null>(null);
const userKey = ["auth", "user"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: userKey,
    retry: false,
    staleTime: Infinity,
    queryFn: async () => {
      const token = await tokenStorage.get();
      if (!token) return null;
      const user = await getMe(token);
      if (!user) await tokenStorage.remove();
      return user;
    },
  });
  const login = useMutation({
    mutationFn: async () => {
      const idToken = await googleSignIn();
      if (!idToken) return;
      const result = await loginWithGoogle(idToken);
      if (!result) return;
      await tokenStorage.set(result.access_token);
      client.setQueryData(userKey, result.user);
    },
  });
  async function signOut() {
    await tokenStorage.remove();
    await googleSignOut();
    await client.cancelQueries();
    client.setQueryData(userKey, null);
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== "auth",
    });
    client.getMutationCache().clear();
  }
  return (
    <AuthContext.Provider
      value={{
        user: query.data ?? null,
        loading: query.isPending,
        signingIn: login.isPending,
        signIn: async () => {
          await login.mutateAsync();
        },
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}
