import type { Metadata } from "next";
import Link from "next/link";
import { AvailabilityEditor } from "@/components/availability-editor";
import { CopyButton } from "@/components/admin/buttons";
import { FormSection } from "@/components/admin/field";
import { PageHeader } from "@/components/admin/page-header";
import { SubjectSwatch } from "@/components/subject-mark";
import { shareUrl } from "@/lib/auth";
import { listAvailability, listSubjects } from "@/lib/queries";
import { addDays, isoWeekday, todayKey, weekStart } from "@/lib/time";
import { addWindowAction, removeWindowAction } from "../../schedule-actions";
import { ProposalPanel } from "./proposal-panel";

export const metadata: Metadata = { title: "排课助手" };

export default function SchedulingPage() {
  const windows = listAvailability();
  const subjects = listSubjects();
  const today = todayKey();
  const defaultWeek = isoWeekday(today) >= 5 ? addDays(weekStart(today), 7) : today;
  const teacherLink = shareUrl("/availability");
  const missing = subjects.filter(
    (subject) => subject.weeklyLessons > 0 && !windows.some((row) => row.subjectId === subject.id),
  );

  return (
    <>
      <PageHeader
        title="排课助手"
        description="填好学生和各科老师每周有空的时间，系统会算出互不冲突的上课时间，确认后一键加入课表。"
      />

      <div className="space-y-10">
        <FormSection title="1. 学生每周可以上课的时间">
          <AvailabilityEditor
            windows={windows.filter((row) => row.ownerType === "student")}
            addAction={addWindowAction.bind(null, null)}
            removeAction={removeWindowAction}
          />
        </FormSection>

        <FormSection
          title="2. 各科老师有空的时间"
          description="可以在这里代填，也可以把下面的链接发给老师，让老师自己填。每周节数和每节时长在「科目与老师」里改。"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-md bg-paper px-3 py-2 text-sm text-ink-2">{teacherLink}</code>
            <CopyButton value={teacherLink} label="复制给老师的链接" />
          </div>
          {missing.length > 0 ? (
            <p className="text-sm text-warning">还没填时间：{missing.map((subject) => subject.name).join("、")}</p>
          ) : null}
          <div className="divide-y divide-rule border-y border-rule">
            {subjects.map((subject) => (
              <div key={subject.id} className="grid gap-3 py-4 lg:grid-cols-[12rem_1fr]">
                <div>
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <SubjectSwatch hue={subject.hue} />
                    {subject.name}
                    <span className="text-sm font-normal text-ink-3">{subject.teacherName}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-ink-3">
                    每周 {subject.weeklyLessons} 节，每节 {subject.lessonMinutes} 分钟
                    <Link href={`/admin/subjects/${subject.id}`} className="ml-2 text-brand hover:underline">
                      修改
                    </Link>
                  </p>
                </div>
                <AvailabilityEditor
                  windows={windows.filter((row) => row.subjectId === subject.id)}
                  addAction={addWindowAction.bind(null, subject.id)}
                  removeAction={removeWindowAction}
                  emptyText="老师还没填"
                />
              </div>
            ))}
          </div>
        </FormSection>

        <FormSection title="3. 生成排课建议">
          <ProposalPanel defaultWeek={defaultWeek} />
        </FormSection>
      </div>
    </>
  );
}
