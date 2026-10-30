import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  variant?: "primary" | "secondary";
};

export function Button({
  title,
  variant = "primary",
  className = "",
  ...props
}: Props) {
  const base =
    "min-h-12 min-w-12 rounded-lg px-5 text-sm font-semibold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
  const styles =
    variant === "secondary"
      ? "border border-line bg-soft text-ink"
      : "bg-brand text-on-brand";
  return (
    <button type="button" className={`${base} ${styles} ${className}`} {...props}>
      {title}
    </button>
  );
}
