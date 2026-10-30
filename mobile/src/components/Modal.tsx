import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className="m-auto w-[calc(100%-32px)] max-w-[480px] rounded-xl border border-line bg-canvas p-4 text-ink backdrop:bg-scrim/60"
      onCancel={(event) => {
        event.preventDefault();
        event.currentTarget.close();
      }}
      onClose={(event) => {
        // Ignore a queued cleanup event if StrictMode has reopened the dialog.
        if (!event.currentTarget.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex flex-col gap-4"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
