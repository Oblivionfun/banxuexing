"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { SubmitButton } from "@/components/admin/buttons";
import { Field } from "@/components/admin/field";
import { SubjectSwatch } from "@/components/subject-mark";
import { Button } from "@/components/ui/button";
import { LESSON_SOURCES, LESSON_STATUSES, type LessonSource, type LessonStatus } from "@/lib/enums";
import { lessonSourceLabel, lessonStatusLabel } from "@/lib/labels";
import { fromMinutes, isTimeString, toMinutes } from "@/lib/time";
import { saveLessonAction, type FormState } from "../../actions";
import { structureSummaryAction } from "../../ai-actions";

export type LessonFormValues = {
  subjectId?: number;
  date: string;
  startTime: string;
  endTime: string;
  status: LessonStatus;
  topic: string;
  summaryMd: string;
  homework: string;
  prep: string;
  planMd: string;
  planPrep: string;
  recordingUrl: string;
  source: LessonSource;
};

type SubjectOption = { id: number; name: string; hue: number; lessonMinutes: number };

export function LessonForm({
  lessonId,
  initial,
  subjects,
  aiEnabled,
}: {
  lessonId: number | null;
  initial: LessonFormValues;
  subjects: SubjectOption[];
  aiEnabled: boolean;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    saveLessonAction.bind(null, lessonId),
    {},
  );
  const [subjectId, setSubjectId] = useState(initial.subjectId);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [status, setStatus] = useState<LessonStatus>(initial.status);
  const [source, setSource] = useState<LessonSource>(initial.source);
  const [topic, setTopic] = useState(initial.topic);
  const [summary, setSummary] = useState(initial.summaryMd);
  const [homework, setHomework] = useState(initial.homework);
  const [prep, setPrep] = useState(initial.prep);
  const [raw, setRaw] = useState("");
  const [structuring, startStructuring] = useTransition();
  // 服务端提示时间冲突后，再点一次保存即确认；之后改了日期或时间就要重新确认
  const [editedAfter, setEditedAfter] = useState<FormState | null>(null);
  const allowOverlap = Boolean(state.needsConfirm) && editedAfter !== state;
  const markTimeEdited = () => setEditedAfter(state);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  const onStartChange = (value: string) => {
    setStartTime(value);
    markTimeEdited();
    const minutes = subjects.find((item) => item.id === subjectId)?.lessonMinutes ?? 90;
    if (isTimeString(value)) {
      const end = toMinutes(value) + minutes;
      if (end < 24 * 60) setEndTime(fromMinutes(end));
    }
  };

  const structure = () =>
    startStructuring(async () => {
      const result = await structureSummaryAction(raw, subjectId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { result: parsed } = result;
      if (parsed.topic && !topic) setTopic(parsed.topic);
      setSummary(parsed.summary);
      setHomework(parsed.homework);
      setPrep(parsed.prep);
      if (status === "planned") setStatus("done");
      if (source === "manual") setSource("wechat");
      if (result.note) toast.warning(result.note);
      else toast.success(result.engine === "ai" ? "已用大模型整理，请检查后保存" : "已按小标题拆分，请检查后保存");
    });

  return (
    <form action={formAction} className="pb-20 sm:pb-0">
      <input type="hidden" name="subjectId" value={subjectId ?? ""} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="allowOverlap" value={allowOverlap ? "1" : ""} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <Field label="科目" error={errors.subjectId}>
            <div role="radiogroup" aria-label="科目" className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3">
              {subjects.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={item.id === subjectId}
                  onClick={() => setSubjectId(item.id)}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 rounded-lg border text-[0.9375rem] transition-colors duration-150",
                    item.id === subjectId
                      ? "border-brand bg-brand-tint font-medium text-brand"
                      : "border-rule-strong bg-surface text-ink hover:border-ink-3",
                  )}
                >
                  <SubjectSwatch hue={item.hue} />
                  {item.name}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="日期" htmlFor="date" error={errors.date} className="col-span-2 sm:col-span-1">
              <input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={initial.date}
                onChange={markTimeEdited}
                className="field"
              />
            </Field>
            <Field label="开始" htmlFor="startTime" error={errors.startTime}>
              <input
                id="startTime"
                name="startTime"
                type="time"
                required
                step={300}
                value={startTime}
                onChange={(event) => onStartChange(event.target.value)}
                className="field tabular"
              />
            </Field>
            <Field label="结束" htmlFor="endTime" error={errors.endTime}>
              <input
                id="endTime"
                name="endTime"
                type="time"
                required
                step={300}
                value={endTime}
                onChange={(event) => {
                  setEndTime(event.target.value);
                  markTimeEdited();
                }}
                className="field tabular"
              />
            </Field>
          </div>

          <Field label="状态">
            <div role="radiogroup" aria-label="状态" className="inline-flex rounded-lg bg-secondary p-1">
              {LESSON_STATUSES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={status === value}
                  onClick={() => setStatus(value)}
                  className={cn(
                    "h-9 rounded-md px-4 text-[0.9375rem] transition-colors duration-150",
                    status === value
                      ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(20,22,26,0.08)]"
                      : "text-ink-2",
                  )}
                >
                  {lessonStatusLabel(value)}
                </button>
              ))}
            </div>
          </Field>

          <Field label="主题（可选）" htmlFor="topic" hint="一句话说明这节课讲什么，例如：一元一次方程" error={errors.topic}>
            <input
              id="topic"
              name="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={100}
              className="field"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="纪要来源" htmlFor="source">
              <select
                id="source"
                name="source"
                value={source}
                onChange={(event) => setSource(event.target.value as LessonSource)}
                className="field"
              >
                {LESSON_SOURCES.map((value) => (
                  <option key={value} value={value}>
                    {lessonSourceLabel(value)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="腾讯会议回放链接（可选）" htmlFor="recordingUrl" error={errors.recordingUrl}>
              <input
                id="recordingUrl"
                name="recordingUrl"
                type="url"
                inputMode="url"
                defaultValue={initial.recordingUrl}
                placeholder="https://meeting.tencent.com/…"
                className="field"
              />
            </Field>
          </div>

          <div className="space-y-4 border-t border-rule pt-6">
            <div>
              <h2 className="font-semibold text-ink">课前计划</h2>
              <p className="mt-0.5 text-sm text-ink-3">
                老师上课前发的安排。也可以在“导入群消息”里粘贴老师原文，自动填到这里。
              </p>
            </div>
            <Field label="计划内容" htmlFor="planMd" hint="讲什么、时间怎么安排、用哪些资料" error={errors.planMd}>
              <textarea id="planMd" name="planMd" defaultValue={initial.planMd} className="field min-h-32" />
            </Field>
            <Field label="课前准备" htmlFor="planPrep" hint="一行一条，例如上课要带的教材、试卷" error={errors.planPrep}>
              <textarea id="planPrep" name="planPrep" defaultValue={initial.planPrep} className="field min-h-20" />
            </Field>
          </div>
        </div>

        <div className="space-y-6">
          <details className="group rounded-lg border border-rule bg-surface" open={!initial.summaryMd}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium text-ink">
              <Sparkles className="size-4 text-brand" />
              粘贴老师在群里发的总结，自动拆分
              <span className="ml-auto text-sm font-normal text-ink-3 group-open:hidden">展开</span>
            </summary>
            <div className="space-y-3 border-t border-rule px-4 pt-3 pb-4">
              <textarea
                aria-label="老师原文"
                value={raw}
                onChange={(event) => setRaw(event.target.value)}
                placeholder={"例如：\n今天讲了一元一次方程，移项还要多练。\n作业：练习册 P23–25\n下节课：带三角板"}
                className="field min-h-32"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={structure} disabled={structuring || !raw.trim()}>
                  {structuring ? "正在整理…" : "整理到下面"}
                </Button>
                <span className="text-sm text-ink-3">
                  {aiEnabled ? "使用大模型整理，失败时自动按小标题拆分" : "按“作业”“下节课”等小标题拆分"}
                </span>
              </div>
            </div>
          </details>

          <Field label="本节内容" htmlFor="summaryMd" hint="讲了什么、孩子表现如何。可以分段，支持简单的列表。" error={errors.summaryMd}>
            <textarea
              id="summaryMd"
              name="summaryMd"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className="field min-h-40"
            />
          </Field>
          <Field label="课后作业" htmlFor="homework" hint="一行一条" error={errors.homework}>
            <textarea
              id="homework"
              name="homework"
              value={homework}
              onChange={(event) => setHomework(event.target.value)}
              className="field min-h-24"
            />
          </Field>
          <Field label="下节课准备" htmlFor="prep" hint="一行一条，例如要带的资料、要预习的章节" error={errors.prep}>
            <textarea
              id="prep"
              name="prep"
              value={prep}
              onChange={(event) => setPrep(event.target.value)}
              className="field min-h-24"
            />
          </Field>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mt-8 sm:border-t-0 sm:bg-transparent sm:p-0">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <SubmitButton className="min-w-32">{allowOverlap ? "仍然保存" : "保存"}</SubmitButton>
          {state.error ? (
            <p role="alert" className={cn("text-sm", state.needsConfirm ? "text-warning" : "text-danger")}>
              {state.error}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
