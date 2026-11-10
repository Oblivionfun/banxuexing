"use client";

import { cn } from "cn";
import { SubjectSwatch } from "@/components/subject-mark";

type SubjectChoice = { id: number; name: string; hue: number };

/** 科目单选：带学科色块的按钮网格。列数随页面布局不同，由 className 决定。 */
export function SubjectPicker({
  subjects,
  value,
  onChange,
  className,
}: {
  subjects: SubjectChoice[];
  value: number | null | undefined;
  onChange: (id: number) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="科目" className={cn("grid grid-cols-3 gap-2 sm:grid-cols-5", className)}>
      {subjects.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={item.id === value}
          onClick={() => onChange(item.id)}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-lg border text-[0.9375rem] transition-colors duration-150",
            item.id === value
              ? "border-brand bg-brand-tint font-medium text-brand"
              : "border-rule-strong bg-surface text-ink hover:border-ink-3",
          )}
        >
          <SubjectSwatch hue={item.hue} />
          {item.name}
        </button>
      ))}
    </div>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string; disabled?: boolean };

/** 两三个选项之间切换的分段按钮，例如课程状态、上传方式。 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ReadonlyArray<SegmentOption<T>>;
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-secondary p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-9 rounded-md px-4 text-[0.9375rem] transition-colors duration-150 disabled:opacity-40",
            value === option.value
              ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(20,22,26,0.08)]"
              : "text-ink-2",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
