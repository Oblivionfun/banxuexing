"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/admin/buttons";
import { Field } from "@/components/admin/field";
import { MATERIAL_CATEGORIES, type MaterialCategory } from "@/lib/enums";
import { materialCategoryLabel } from "@/lib/labels";
import { updateMaterialSetAction, type FormState } from "../../../actions";

export function SetForm({
  setId,
  subjects,
  initial,
}: {
  setId: number;
  subjects: { id: number; name: string }[];
  initial: { subjectId: number; category: MaterialCategory; title: string; note: string };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    updateMaterialSetAction.bind(null, setId),
    {},
  );
  const errors = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-5">
      <Field label="标题" htmlFor="title" error={errors.title}>
        <input id="title" name="title" defaultValue={initial.title} maxLength={80} required className="field" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="科目" htmlFor="subjectId" error={errors.subjectId}>
          <select id="subjectId" name="subjectId" defaultValue={initial.subjectId} className="field">
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="类别" htmlFor="category" error={errors.category}>
          <select id="category" name="category" defaultValue={initial.category} className="field">
            {MATERIAL_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {materialCategoryLabel(value)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="备注" htmlFor="note" error={errors.note}>
        <textarea id="note" name="note" defaultValue={initial.note} maxLength={1000} className="field min-h-24" />
      </Field>
      <div className="flex items-center gap-3">
        <SubmitButton>保存</SubmitButton>
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      </div>
    </form>
  );
}
