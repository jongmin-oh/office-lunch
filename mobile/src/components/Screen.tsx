import type { ReactNode } from "react";

export function Screen({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col overflow-y-auto">
      <header className="flex min-h-14 items-center justify-between border-b border-line px-4">
        <h1 className="text-lg font-semibold">{title}</h1>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </main>
  );
}
