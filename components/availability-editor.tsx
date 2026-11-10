"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { weekdayNameFromIso } from "@/lib/time";

type WindowRow = { id: number; weekday: number; startTime: string; endTime: string };
type Result = { ok?: boolean; error?: string };

export function AvailabilityEditor({
  windows,
  addAction,
  removeAction,
  emptyText = "还没有填写",
}: {
  windows: WindowRow[];
  addAction: (prev: Result, formData: FormData) => Promise<Result>;
  removeAction: (id: number) => Promise<void>;
  emptyText?: string;
}) {
  const [state, action, adding] = useActionState<Result, FormData>(addAction, {});
  const [removing, startRemoving] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  const sorted = [...windows].sort((a, b) =>
    a.weekday === b.weekday ? a.startTime.localeCompare(b.startTime) : a.weekday - b.weekday,
  );

  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <p className="text-sm text-ink-3">{emptyText}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {sorted.map((row) => (
            <li
              key={row.id}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-rule-strong bg-surface pr-1 pl-3 text-[0.9375rem]"
            >
              <span className="text-ink-2">{weekdayNameFromIso(row.weekday)}</span>
              <span className="tabular text-ink">
                {row.startTime}–{row.endTime}
              </span>
              <button
                type="button"
                disabled={removing}
                onClick={() => startRemoving(() => removeAction(row.id))}
                aria-label={`删除 ${weekdayNameFromIso(row.weekday)} ${row.startTime}–${row.endTime}`}
                className="flex size-7 items-center justify-center rounded-full text-ink-3 hover:bg-secondary hover:text-danger"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2">
        <label className="w-24">
          <span className="sr-only">星期</span>
          <select name="weekday" defaultValue="3" className="field">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <option key={day} value={day}>
                {weekdayNameFromIso(day)}
              </option>
            ))}
          </select>
        </label>
        <label className="w-28">
          <span className="sr-only">开始</span>
          <input name="startTime" type="time" step={1800} defaultValue="09:00" required className="field tabular" />
        </label>
        <span className="pb-2.5 text-ink-3">到</span>
        <label className="w-28">
          <span className="sr-only">结束</span>
          <input name="endTime" type="time" step={1800} defaultValue="12:00" required className="field tabular" />
        </label>
        <Button type="submit" variant="outline" disabled={adding}>
          <Plus />
          添加
        </Button>
      </form>
    </div>
  );
}
