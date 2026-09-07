import type { ButtonHTMLAttributes } from "react";

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60 ${className}`} {...props} />;
}
