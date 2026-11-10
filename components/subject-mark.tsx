import { cn } from "cn";
import { subjectStyle } from "@/lib/subjects";

export function SubjectSwatch({ hue, className }: { hue: number; className?: string }) {
  return (
    <span
      aria-hidden
      style={subjectStyle(hue)}
      className={cn("subj-swatch inline-block size-2.5 shrink-0 rounded-[3px]", className)}
    />
  );
}

export function SubjectTag({
  name,
  hue,
  className,
}: {
  name: string;
  hue: number;
  className?: string;
}) {
  return (
    <span
      style={subjectStyle(hue)}
      className={cn(
        "subj-tint subj-ink inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm font-medium tracking-[0.01em]",
        className,
      )}
    >
      <SubjectSwatch hue={hue} />
      {name}
    </span>
  );
}
