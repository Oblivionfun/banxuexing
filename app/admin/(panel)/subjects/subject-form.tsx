"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { SubmitButton } from "@/components/admin/buttons";
import { Field, FormSection } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { SUBJECT_HUES, subjectStyle } from "@/lib/subjects";
import { TEACHER_PROFILE_TEMPLATE } from "@/lib/teacher-profile";
import { saveSubjectAction, type FormState } from "../../actions";

export type SubjectFormValues = {
  name: string;
  hue: number;
  sortOrder: number;
  teacherName: string;
  teacherNote: string;
  teacherProfile: string;
  planMd: string;
  weeklyLessons: number;
  lessonMinutes: number;
};

export function SubjectForm({ subjectId, initial }: { subjectId: number | null; initial: SubjectFormValues }) {
  const [state, action] = useActionState<FormState, FormData>(saveSubjectAction.bind(null, subjectId), {});
  const [hue, setHue] = useState(initial.hue);
  const [profile, setProfile] = useState(initial.teacherProfile);
  const errors = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={action} className="max-w-2xl space-y-8">
      <input type="hidden" name="hue" value={hue} />
      <FormSection title="科目">
        <div className="grid grid-cols-2 gap-4">
          <Field label="科目名" htmlFor="name" error={errors.name}>
            <input id="name" name="name" defaultValue={initial.name} maxLength={12} required className="field" />
          </Field>
          <Field label="排序" htmlFor="sortOrder" hint="数字小的排在前面" error={errors.sortOrder}>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              max={99}
              defaultValue={initial.sortOrder}
              className="field tabular"
            />
          </Field>
        </div>
        <Field label="颜色" error={errors.hue} hint="只用来在课表里区分科目">
          <div role="radiogroup" aria-label="颜色" className="flex flex-wrap gap-2">
            {SUBJECT_HUES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={hue === value}
                aria-label={`色相 ${value}`}
                onClick={() => setHue(value)}
                style={subjectStyle(value)}
                className={cn(
                  "subj-tint flex size-11 items-center justify-center rounded-lg border-2 transition-colors duration-150",
                  hue === value ? "border-brand" : "border-transparent",
                )}
              >
                <span className="subj-swatch size-4 rounded-[4px]" />
              </button>
            ))}
          </div>
        </Field>
      </FormSection>

      <FormSection title="任课老师">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="老师称呼" htmlFor="teacherName" hint="例如：张老师" error={errors.teacherName}>
            <input id="teacherName" name="teacherName" defaultValue={initial.teacherName} maxLength={20} className="field" />
          </Field>
          <Field label="说明（可选）" htmlFor="teacherNote" hint="只在管理端显示，例如联系方式" error={errors.teacherNote}>
            <input id="teacherNote" name="teacherNote" defaultValue={initial.teacherNote} maxLength={200} className="field" />
          </Field>
        </div>
        <Field
          label="老师简历"
          htmlFor="teacherProfile"
          hint="家长在科目页的“老师介绍”里能看到。按模板填写，冒号后面留空的项不会显示。"
          error={errors.teacherProfile}
        >
          <textarea
            id="teacherProfile"
            name="teacherProfile"
            value={profile}
            onChange={(event) => setProfile(event.target.value)}
            className="field min-h-96 leading-7"
          />
        </Field>
        {profile.trim() ? null : (
          <Button type="button" variant="outline" size="sm" onClick={() => setProfile(TEACHER_PROFILE_TEMPLATE)}>
            填入简历模板
          </Button>
        )}
      </FormSection>

      <FormSection title="老师整体规划" description="家长在科目页能看到。可以写阶段目标、教学安排、需要家长配合的事。">
        <Field label="规划内容" htmlFor="planMd" error={errors.planMd}>
          <textarea id="planMd" name="planMd" defaultValue={initial.planMd} className="field min-h-48" />
        </Field>
      </FormSection>

      <FormSection title="排课设置" description="排课助手会按这里的节数和时长给出建议时间。">
        <div className="grid grid-cols-2 gap-4">
          <Field label="每周节数" htmlFor="weeklyLessons" error={errors.weeklyLessons}>
            <input
              id="weeklyLessons"
              name="weeklyLessons"
              type="number"
              min={0}
              max={14}
              defaultValue={initial.weeklyLessons}
              className="field tabular"
            />
          </Field>
          <Field label="每节时长（分钟）" htmlFor="lessonMinutes" error={errors.lessonMinutes}>
            <input
              id="lessonMinutes"
              name="lessonMinutes"
              type="number"
              min={30}
              max={240}
              step={5}
              defaultValue={initial.lessonMinutes}
              className="field tabular"
            />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center gap-3">
        <SubmitButton>{subjectId === null ? "添加科目" : "保存"}</SubmitButton>
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      </div>
    </form>
  );
}
