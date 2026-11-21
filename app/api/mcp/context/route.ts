import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from "@/lib/file-types";
import { MATERIAL_CATEGORIES } from "@/lib/enums";
import { materialCategoryLabel } from "@/lib/labels";
import { ok, runMcp } from "@/lib/mcp/http";
import { getStudent, listMaterialSets, listSubjects } from "@/lib/queries";
import { todayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return runMcp(request, () => {
    const student = getStudent();
    const subjects = listSubjects();
    const sets = listMaterialSets().slice(0, 15);

    return ok({
      student: { name: student.name, grade: student.grade },
      today: todayKey(),
      timezone: "Asia/Shanghai",
      subjects: subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        slug: subject.slug,
        teacher: subject.teacherName,
        weeklyLessons: subject.weeklyLessons,
        lessonMinutes: subject.lessonMinutes,
      })),
      materialCategories: MATERIAL_CATEGORIES.map((value) => ({
        value,
        label: materialCategoryLabel(value),
      })),
      recentMaterialSets: sets.map((set) => ({
        id: set.id,
        subject: set.subject.name,
        category: set.category,
        title: set.title,
        fileCount: set.fileCount,
      })),
      limits: {
        maxUploadBytes: MAX_UPLOAD_BYTES,
        accept: ACCEPT_ATTRIBUTE,
      },
      rules: [
        "日期用 YYYY-MM-DD，时间用 HH:mm，按北京时间理解。",
        "上传前先用 list_subjects 和 list_material_sets 确认科目与资料册；拿不准就先问工作人员。",
        "ensure_material_set 会复用同名资料册，不会重复建册。",
        "排课先用 propose_schedule 给出可行时间，得到工作人员确认后再 create_lessons，并传 confirm: true。",
        "有冲突时必须由工作人员明确同意，才传 allowOverlap: true。",
        "不要删除任何内容；需要删除时让工作人员在管理端操作。",
      ],
    });
  });
}
