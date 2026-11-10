import Link from "next/link";
import type { ReactNode } from "react";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-[1.0625rem] font-semibold tracking-[0.06em] text-white"
    >
      <svg viewBox="0 0 20 20" aria-hidden className="size-5">
        <path
          d="M10 1.8l2.2 5.1 5.5.5-4.2 3.6 1.3 5.4L10 13.6l-4.8 2.8 1.3-5.4L2.3 7.4l5.5-.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="9.6" r="1.6" fill="#ff8a7a" />
      </svg>
      伴学星
    </Link>
  );
}

export function BrandBar({ children, home = "/" }: { children?: ReactNode; home?: string }) {
  return (
    <header className="sticky top-0 z-30 bg-brand text-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Wordmark href={home} />
        {children}
      </div>
    </header>
  );
}
