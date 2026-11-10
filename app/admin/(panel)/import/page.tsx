import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { isAiConfigured } from "@/lib/env";
import { listSubjects } from "@/lib/queries";
import { todayKey } from "@/lib/time";
import { ImportFlow } from "./import-flow";

export const metadata: Metadata = { title: "导入群消息" };

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="导入群消息"
        description="把老师在群里发的课前计划或课后总结粘贴进来，自动认出是哪科哪天、对应哪节课。确认无误再保存。"
      />
      <ImportFlow
        today={todayKey()}
        aiEnabled={isAiConfigured()}
        subjects={listSubjects().map(({ id, name, hue, teacherName, lessonMinutes }) => ({
          id,
          name,
          hue,
          teacherName,
          lessonMinutes,
        }))}
      />
    </>
  );
}
