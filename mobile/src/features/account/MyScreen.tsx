import { useState } from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth";

export function MyScreen() {
  const { user, signOut } = useAuth();
  const [modal, setModal] = useState(false);
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "system",
  );

  function handleThemeChange(value: string) {
    setTheme(value);
    document.documentElement.dataset.theme = value;
  }

  return (
    <>
      <Screen title="내 정보">
        <article className="flex items-center gap-3 border-b border-line bg-canvas p-4 text-ink">
          <span
            role="img"
            aria-label="사용자 아바타"
            className="inline-flex size-12 items-center justify-center rounded-full bg-soft text-sm font-semibold text-ink"
          >
            {user?.name.slice(0, 1) || "?"}
          </span>
          <div>
            <h2 className="text-base font-semibold">{user?.name}</h2>
            <p className="mt-1 text-sm text-muted">{user?.email}</p>
          </div>
        </article>
        <section className="border-b border-line bg-canvas p-4 text-ink">
          <label htmlFor="theme" className="block text-sm font-semibold">
            테마
          </label>
          <select
            id="theme"
            value={theme}
            onChange={(event) => handleThemeChange(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-lg border border-line bg-canvas px-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <option value="system">시스템</option>
            <option value="light">라이트</option>
            <option value="dark">다크</option>
          </select>
        </section>
        <div className="p-4">
          <Button
            title="로그아웃"
            variant="secondary"
            className="w-full"
            onClick={() => setModal(true)}
          />
        </div>
      </Screen>
      {modal && (
        <Modal title="로그아웃할까요?" onClose={() => setModal(false)}>
          <p className="text-sm text-muted">계정에서 로그아웃합니다.</p>
          <div className="flex gap-3">
            <Button
              title="취소"
              variant="secondary"
              className="flex-1"
              onClick={() => setModal(false)}
            />
            <Button
              title="로그아웃"
              className="flex-1"
              onClick={() => void signOut()}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
