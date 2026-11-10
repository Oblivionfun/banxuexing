"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/admin/field";
import { SubjectTag } from "@/components/subject-mark";
import { Button } from "@/components/ui/button";
import { formatDateWithWeekday, formatWeekRange } from "@/lib/time";
import {
  applyScheduleAction,
  generateScheduleAction,
  type ScheduleProposal,
} from "../../schedule-actions";

export function ProposalPanel({ defaultWeek }: { defaultWeek: string }) {
  const [week, setWeek] = useState(defaultWeek);
  const [proposal, setProposal] = useState<ScheduleProposal | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [generating, startGenerating] = useTransition();
  const [applying, startApplying] = useTransition();

  const generate = () =>
    startGenerating(async () => {
      const result = await generateScheduleAction(week);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setProposal(result);
      setSelected(new Set(result.slots.map((_, index) => index)));
    });

  const apply = () =>
    startApplying(async () => {
      if (!proposal) return;
      const slots = proposal.slots
        .filter((_, index) => selected.has(index))
        .map(({ subjectId, date, startTime, endTime }) => ({ subjectId, date, startTime, endTime }));
      const result = await applyScheduleAction(slots);
      if (result.error) toast.error(result.error);
      else {
        toast.success(result.message ?? "已加入课表");
        setProposal(null);
      }
    });

  const toggle = (index: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const days = proposal ? [...new Set(proposal.slots.map((slot) => slot.date))] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="要排哪一周（选这一周里任意一天）" htmlFor="week" className="w-64">
          <input id="week" type="date" value={week} onChange={(event) => setWeek(event.target.value)} className="field" />
        </Field>
        <Button type="button" onClick={generate} disabled={generating}>
          <Wand2 />
          {generating ? "正在计算…" : "生成排课建议"}
        </Button>
      </div>

      {proposal ? (
        <div className="rounded-lg border border-rule bg-surface p-4 sm:p-5">
          <h3 className="font-semibold text-ink">{formatWeekRange(proposal.weekStart)} 的建议</h3>
          <p className="mt-1 text-sm text-ink-3">
            已避开这一周已有的课程，课与课之间留 15 分钟，同一科目一天最多一节。勾掉不想要的再加入课表。
          </p>

          {proposal.slots.length === 0 ? (
            <p className="mt-4 text-ink-2">没有找到可排的时间。</p>
          ) : (
            <div className="mt-4 space-y-4">
              {days.map((day) => (
                <section key={day}>
                  <h4 className="text-sm font-medium text-ink-2">{formatDateWithWeekday(day)}</h4>
                  <ul className="mt-1.5 divide-y divide-rule border-y border-rule">
                    {proposal.slots.map((slot, index) =>
                      slot.date === day ? (
                        <li key={index}>
                          <label className="flex cursor-pointer items-center gap-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={selected.has(index)}
                              onChange={() => toggle(index)}
                              className="size-4 accent-[var(--brand)]"
                            />
                            <span className="tabular w-28 text-ink-2">
                              {slot.startTime}–{slot.endTime}
                            </span>
                            <SubjectTag name={slot.subjectName} hue={slot.hue} />
                          </label>
                        </li>
                      ) : null,
                    )}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {proposal.unmet.length > 0 ? (
            <div className="mt-5 rounded-md bg-warning-tint px-4 py-3 text-[0.9375rem] text-warning">
              <p className="font-medium">有些课没排进去</p>
              <ul className="mt-1 space-y-0.5">
                {proposal.unmet.map((item) => (
                  <li key={item.subjectId}>
                    {item.name}：还差 {item.missing} 节，{item.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {proposal.slots.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={apply} disabled={applying || selected.size === 0}>
                <CalendarCheck />
                {applying ? "正在加入…" : `把选中的 ${selected.size} 节加入课表`}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setProposal(null)}>
                不要了
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
