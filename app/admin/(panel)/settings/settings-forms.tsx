"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { ActionButton, SubmitButton } from "@/components/admin/buttons";
import { Field } from "@/components/admin/field";
import { saveStudentAction, type FormState } from "../../actions";
import { saveWebhookAction, testWebhookAction } from "../../notify-actions";

function useToastOnSave(state: FormState) {
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);
}

export function StudentForm({ initial }: { initial: { name: string; grade: string; intro: string } }) {
  const [state, action] = useActionState<FormState, FormData>(saveStudentAction, {});
  useToastOnSave(state);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="学生称呼" htmlFor="name" hint="页面顶部显示，例如：小星" error={errors.name}>
          <input id="name" name="name" defaultValue={initial.name} maxLength={20} required className="field" />
        </Field>
        <Field label="年级（可选）" htmlFor="grade" error={errors.grade}>
          <input id="grade" name="grade" defaultValue={initial.grade} maxLength={20} placeholder="例如：初二" className="field" />
        </Field>
      </div>
      <Field label="简介（可选）" htmlFor="intro" hint="显示在家长端首页，例如本学期的目标" error={errors.intro}>
        <textarea id="intro" name="intro" defaultValue={initial.intro} maxLength={500} className="field min-h-20" />
      </Field>
      <SubmitButton>保存</SubmitButton>
    </form>
  );
}

export function WebhookForm({ initial }: { initial: string }) {
  const [state, action] = useActionState<FormState, FormData>(saveWebhookAction, {});
  useToastOnSave(state);
  return (
    <form action={action} className="space-y-4">
      <Field
        label="群机器人地址"
        htmlFor="webhook"
        hint="在企业微信群右上角 → 群机器人 → 添加机器人，复制 Webhook 地址。留空保存可以取消。"
        error={state.fieldErrors?.webhook}
      >
        <input
          id="webhook"
          name="webhook"
          type="url"
          inputMode="url"
          defaultValue={initial}
          placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…"
          className="field font-[ui-monospace,monospace] text-sm"
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton size="sm">保存</SubmitButton>
        {initial ? (
          <ActionButton action={testWebhookAction} variant="outline">
            发一条测试消息
          </ActionButton>
        ) : null}
      </div>
    </form>
  );
}
