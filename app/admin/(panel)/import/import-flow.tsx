"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CircleCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Segmented, SubjectPicker, type SegmentOption } from "@/components/admin/choice";
import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { suggestLesson, type GroupMessageKind, type LessonCandidate } from "@/lib/group-message";
import { lessonStatusLabel } from "@/lib/labels";
import { formatDateWithWeekday, fromMinutes, isTimeString, toMinutes } from "@/lib/time";
import { analyzeGroupMessageAction, applyGroupMessageAction, lessonCandidatesAction } from "../../import-actions";

type SubjectOption = { id: number; name: string; hue: number; teacherName: string; lessonMinutes: number };

const KINDS: ReadonlyArray<SegmentOption<GroupMessageKind>> = [
  { value: "plan", label: "课前计划" },
  { value: "notes", label: "课后纪要" },
];

type Draft = {
  kind: GroupMessageKind | null;
  subjectId: number | null;
  date: string;
  lessonChoice: number | "new";
  startTime: string;
  endTime: string;
  topic: string;
  planMd: string;
  planPrep: string;
  summary: string;
  homework: string;
  prep: string;
  teacherName: string;
  updateTeacher: boolean;
};

function endFor(startTime: string, minutes: number): string {
  if (!isTimeString(startTime)) return "";
  const end = toMinutes(startTime) + minutes;
  return end < 24 * 60 ? fromMinutes(end) : "";
}

export function ImportFlow({
  subjects,
  today,
  aiEnabled,
}: {
  subjects: SubjectOption[];
  today: string;
  aiEnabled: boolean;
}) {
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [candidates, setCandidates] = useState<LessonCandidate[]>([]);
  const [engineNote, setEngineNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState<{ lessonId: number; message: string } | null>(null);
  const [analyzing, startAnalyzing] = useTransition();
  const [saving, startSaving] = useTransition();
  const [loadingLessons, startLoadingLessons] = useTransition();

  const subject = subjects.find((item) => item.id === draft?.subjectId);
  const update = (patch: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  const analyze = () =>
    startAnalyzing(async () => {
      const result = await analyzeGroupMessageAction(raw);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { parsed } = result;
      const matched = subjects.find((item) => item.id === parsed.subjectId);
      const startTime = parsed.startTime ?? "";
      setSaved(null);
      setErrors({});
      setFormError("");
      setCandidates(result.candidates);
      setEngineNote(
        result.note ?? (result.engine === "ai" ? "已用大模型识别，请检查后保存" : "已按规则识别，请检查后保存"),
      );
      setDraft({
        kind: parsed.kind,
        subjectId: parsed.subjectId,
        date: parsed.date ?? today,
        lessonChoice: result.suggestedLessonId ?? "new",
        startTime,
        endTime: endFor(startTime, matched?.lessonMinutes ?? 90),
        topic: parsed.topic,
        planMd: parsed.planMd,
        planPrep: parsed.planPrep,
        summary: parsed.summary,
        homework: parsed.homework,
        prep: parsed.prep,
        teacherName: parsed.teacherName,
        updateTeacher: Boolean(parsed.teacherName && matched && parsed.teacherName !== matched.teacherName),
      });
    });

  const reloadLessons = (next: Draft) =>
    startLoadingLessons(async () => {
      if (!next.subjectId) {
        setCandidates([]);
        return;
      }
      const list = await lessonCandidatesAction(next.subjectId, next.date);
      setCandidates(list);
      const suggested = suggestLesson(list, {
        kind: next.kind ?? "notes",
        date: next.date,
        startTime: isTimeString(next.startTime) ? next.startTime : null,
        today,
      });
      setDraft((current) => (current ? { ...current, lessonChoice: suggested ?? "new" } : current));
    });

  const changeSubject = (id: number) => {
    if (!draft) return;
    const picked = subjects.find((item) => item.id === id);
    const next = {
      ...draft,
      subjectId: id,
      endTime: endFor(draft.startTime, picked?.lessonMinutes ?? 90) || draft.endTime,
      updateTeacher: Boolean(draft.teacherName && picked && draft.teacherName !== picked.teacherName),
    };
    setDraft(next);
    reloadLessons(next);
  };

  const changeDate = (date: string) => {
    if (!draft) return;
    const next = { ...draft, date };
    setDraft(next);
    if (date) reloadLessons(next);
  };

  const save = () =>
    startSaving(async () => {
      if (!draft?.kind || !draft.subjectId) return;
      const result = await applyGroupMessageAction({
        kind: draft.kind,
        subjectId: draft.subjectId,
        lessonId: draft.lessonChoice === "new" ? null : draft.lessonChoice,
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        topic: draft.topic,
        planMd: draft.planMd,
        planPrep: draft.planPrep,
        summary: draft.summary,
        homework: draft.homework,
        prep: draft.prep,
        teacherName: draft.updateTeacher ? draft.teacherName : "",
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
        return;
      }
      toast.success(result.message);
      setSaved({ lessonId: result.lessonId, message: result.message });
      setDraft(null);
      setCandidates([]);
      setRaw("");
    });

  const selected = candidates.find((lesson) => lesson.id === draft?.lessonChoice);
  const overwriting =
    selected && draft?.kind ? (draft.kind === "plan" ? selected.hasPlan : selected.hasNotes) : false;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <section className="space-y-4">
        {saved ? (
          <div className="flex gap-3 rounded-lg border border-rule bg-brand-tint px-4 py-3">
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium text-ink">{saved.message}</p>
              <p className="mt-1 flex flex-wrap gap-x-4 text-sm">
                <Link href={`/lessons/${saved.lessonId}`} className="font-medium text-brand hover:underline">
                  看家长端效果
                </Link>
                <Link href={`/admin/lessons/${saved.lessonId}`} className="font-medium text-brand hover:underline">
                  编辑这节课
                </Link>
              </p>
            </div>
          </div>
        ) : null}
        <Field label="老师原文" htmlFor="raw" hint="在微信里长按老师的消息，点“复制”，粘贴到这里。一次一条。">
          <textarea
            id="raw"
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder={"例如：\n家长、同学您好，我是数学林老师。关于11月11日数学的课前反馈如下：\n1. 本次计划讲：……\n5. 课前准备/提醒：准备好数学教材"}
            className="field min-h-72"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={analyze} disabled={analyzing || !raw.trim()}>
            <Sparkles />
            {analyzing ? "正在识别…" : draft ? "重新识别" : "识别"}
          </Button>
          <span className="text-sm text-ink-3">
            {draft ? engineNote : aiEnabled ? "使用大模型识别，失败时按规则识别" : "按规则识别课前计划和课后总结"}
          </span>
        </div>
      </section>

      {draft ? (
        <section aria-label="确认识别结果" className="space-y-6">
          <Field label="这是" error={draft.kind ? undefined : "看不出是课前还是课后发的，请选一下"}>
            <Segmented
              label="消息类型"
              value={draft.kind}
              options={KINDS}
              onChange={(kind) => {
                const next = { ...draft, kind };
                setDraft(next);
                reloadLessons(next);
              }}
            />
          </Field>

          <Field label="科目" error={errors.subjectId ?? (draft.subjectId ? undefined : "没认出是哪科，请选一下")}>
            <SubjectPicker subjects={subjects} value={draft.subjectId} onChange={changeSubject} />
          </Field>

          <Field label="日期" htmlFor="date" error={errors.date} className="max-w-56">
            <input
              id="date"
              type="date"
              value={draft.date}
              onChange={(event) => changeDate(event.target.value)}
              className="field"
            />
          </Field>

          {draft.subjectId ? (
            <fieldset className="space-y-2" aria-busy={loadingLessons}>
              <legend className="mb-1.5 text-sm font-medium tracking-[0.01em] text-ink-2">写到哪节课</legend>
              {candidates.length === 0 ? (
                <p className="text-sm text-ink-3">这几天{subject?.name}没有排课，保存时会新建一节。</p>
              ) : null}
              {candidates.map((lesson) => (
                <label
                  key={lesson.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors duration-150",
                    draft.lessonChoice === lesson.id ? "border-brand bg-brand-tint" : "border-rule bg-surface hover:border-ink-3",
                  )}
                >
                  <input
                    type="radio"
                    name="lessonChoice"
                    checked={draft.lessonChoice === lesson.id}
                    onChange={() => update({ lessonChoice: lesson.id })}
                    className="mt-1 size-4 accent-brand"
                  />
                  <span className="min-w-0">
                    <span className="tabular block font-medium text-ink">
                      {formatDateWithWeekday(lesson.date)} {lesson.startTime}–{lesson.endTime}
                    </span>
                    <span className="block text-sm text-ink-3">
                      {[
                        lessonStatusLabel(lesson.status),
                        lesson.topic,
                        lesson.hasPlan ? "已有课前计划" : "",
                        lesson.hasNotes ? "已有纪要" : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </label>
              ))}
              <div
                className={cn(
                  "rounded-lg border px-3.5 py-3 transition-colors duration-150",
                  draft.lessonChoice === "new" ? "border-brand bg-brand-tint" : "border-rule bg-surface hover:border-ink-3",
                )}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="lessonChoice"
                    checked={draft.lessonChoice === "new"}
                    onChange={() => update({ lessonChoice: "new" })}
                    className="mt-1 size-4 accent-brand"
                  />
                  <span className="font-medium text-ink">
                    新建一节课{draft.date ? `（${formatDateWithWeekday(draft.date)}）` : ""}
                  </span>
                </label>
                {draft.lessonChoice === "new" ? (
                  <div className="mt-2 grid max-w-80 grid-cols-2 gap-3 pl-7">
                    <Field label="开始" htmlFor="startTime" error={errors.startTime}>
                      <input
                        id="startTime"
                        type="time"
                        step={300}
                        value={draft.startTime}
                        onChange={(event) =>
                          update({
                            startTime: event.target.value,
                            endTime: endFor(event.target.value, subject?.lessonMinutes ?? 90) || draft.endTime,
                          })
                        }
                        className="field tabular"
                      />
                    </Field>
                    <Field label="结束" htmlFor="endTime" error={errors.endTime}>
                      <input
                        id="endTime"
                        type="time"
                        step={300}
                        value={draft.endTime}
                        onChange={(event) => update({ endTime: event.target.value })}
                        className="field tabular"
                      />
                    </Field>
                  </div>
                ) : null}
              </div>
              {overwriting ? (
                <p role="status" className="text-sm text-warning">
                  这节课已经有{draft.kind === "plan" ? "课前计划" : "纪要"}了，保存会覆盖原来的内容。
                </p>
              ) : null}
            </fieldset>
          ) : null}

          {draft.kind ? (
            <>
              <Field label="主题（可选）" htmlFor="topic" hint="留空则不改这节课原来的主题" error={errors.topic}>
                <input
                  id="topic"
                  value={draft.topic}
                  onChange={(event) => update({ topic: event.target.value })}
                  maxLength={100}
                  className="field"
                />
              </Field>
              {draft.kind === "plan" ? (
                <>
                  <Field label="课前计划" htmlFor="planMd" hint="讲什么、时间怎么安排、用哪些资料" error={errors.planMd}>
                    <textarea
                      id="planMd"
                      value={draft.planMd}
                      onChange={(event) => update({ planMd: event.target.value })}
                      className="field min-h-40"
                    />
                  </Field>
                  <Field label="课前准备" htmlFor="planPrep" hint="一行一条，家长端会用红笔标出" error={errors.planPrep}>
                    <textarea
                      id="planPrep"
                      value={draft.planPrep}
                      onChange={(event) => update({ planPrep: event.target.value })}
                      className="field min-h-20"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="本节内容" htmlFor="summary" error={errors.summary}>
                    <textarea
                      id="summary"
                      value={draft.summary}
                      onChange={(event) => update({ summary: event.target.value })}
                      className="field min-h-40"
                    />
                  </Field>
                  <Field label="课后作业" htmlFor="homework" hint="一行一条" error={errors.homework}>
                    <textarea
                      id="homework"
                      value={draft.homework}
                      onChange={(event) => update({ homework: event.target.value })}
                      className="field min-h-24"
                    />
                  </Field>
                  <Field label="下节课准备" htmlFor="prep" hint="一行一条" error={errors.prep}>
                    <textarea
                      id="prep"
                      value={draft.prep}
                      onChange={(event) => update({ prep: event.target.value })}
                      className="field min-h-20"
                    />
                  </Field>
                </>
              )}
            </>
          ) : null}

          {draft.teacherName && subject && draft.teacherName !== subject.teacherName ? (
            <label className="flex cursor-pointer items-start gap-3 text-[0.9375rem] text-ink">
              <input
                type="checkbox"
                checked={draft.updateTeacher}
                onChange={(event) => update({ updateTeacher: event.target.checked })}
                className="mt-1 size-4 accent-brand"
              />
              <span>
                同时把{subject.name}老师改成“{draft.teacherName}”
                <span className="text-ink-3">（现在是“{subject.teacherName || "未填写"}”）</span>
              </span>
            </label>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-5">
            <Button
              type="button"
              onClick={save}
              disabled={saving || !draft.kind || !draft.subjectId}
              className="min-w-32"
            >
              {saving ? "正在保存…" : "保存到这节课"}
            </Button>
            {formError ? (
              <p role="alert" className="text-sm text-danger">
                {formError}
              </p>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-rule-strong px-5 py-6 text-ink-2 lg:self-start">
          <h2 className="font-medium text-ink">识别后在这里确认</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.9375rem]">
            <li>判断是课前计划还是课后纪要</li>
            <li>认出是哪一科、哪一天，找到课表里对应的那节课</li>
            <li>拆出计划、课前准备、作业等内容，都可以再改</li>
          </ul>
          <p className="mt-3 text-sm text-ink-3">点“保存”之前不会写入任何内容。</p>
        </section>
      )}
    </div>
  );
}
