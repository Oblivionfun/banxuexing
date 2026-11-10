import { cn } from "cn";
import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium tracking-[0.01em] text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-rule pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {description ? <p className="mt-1 text-sm text-ink-3">{description}</p> : null}
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}
