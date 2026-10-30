import { Button } from "@/components/Button";
import { useAuth } from "./AuthProvider";

export function SignIn() {
  const { signIn, signingIn } = useAuth();
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-canvas text-ink pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))] pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]">
      <header className="flex min-h-14 items-center justify-between border-b border-line px-4">
        <h1 className="text-lg font-semibold">로그인</h1>
      </header>
      <main className="flex flex-1 flex-col justify-center gap-6 p-4">
        <article className="border-b border-line bg-canvas p-4 text-ink">
          <h2 className="text-base font-semibold">다시 만나서 반가워요</h2>
          <p className="mt-2 text-sm text-muted">
            Google 계정으로 로그인하세요.
          </p>
        </article>
        <Button
          title="Google로 로그인"
          disabled={signingIn}
          onClick={() => void signIn()}
        />
      </main>
    </div>
  );
}
