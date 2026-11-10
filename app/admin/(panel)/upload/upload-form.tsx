"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Field } from "@/components/admin/field";
import { Uploader, type UploadSummary } from "@/components/admin/uploader";
import { SubjectSwatch } from "@/components/subject-mark";
import { Button } from "@/components/ui/button";
import { MATERIAL_CATEGORIES, type MaterialCategory } from "@/lib/enums";
import { materialCategoryLabel } from "@/lib/labels";
import { formatMonthDay, todayKey } from "@/lib/time";
import { createMaterialSetAction } from "../../actions";
import { NotifyButton } from "../notify-button";

type SubjectOption = { id: number; name: string; hue: number };
type SetOption = {
  id: number;
  title: string;
  subjectId: number;
  category: MaterialCategory;
  fileCount: number;
};

export function UploadForm({
  subjects,
  sets,
  initialSubjectId,
  initialSetId,
}: {
  subjects: SubjectOption[];
  sets: SetOption[];
  initialSubjectId?: number;
  initialSetId?: number;
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState<number | undefined>(initialSubjectId);
  const [mode, setMode] = useState<"new" | "existing">(initialSetId ? "existing" : "new");
  const [existingSetId, setExistingSetId] = useState<number | undefined>(initialSetId);
  const [category, setCategory] = useState<MaterialCategory>("textbook");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [finishedSetId, setFinishedSetId] = useState<number | null>(null);
  const createdSetId = useRef<number | null>(null);

  const subject = subjects.find((item) => item.id === subjectId);
  const subjectSets = useMemo(
    () => sets.filter((set) => set.subjectId === subjectId),
    [sets, subjectId],
  );
  const autoTitle = subject
    ? `${subject.name}${materialCategoryLabel(category)} ${formatMonthDay(todayKey())}`
    : "";
  const effectiveTitle = titleTouched ? title : autoTitle;

  const pickSubject = (id: number) => {
    setSubjectId(id);
    setExistingSetId(undefined);
    createdSetId.current = null;
    setFinishedSetId(null);
    setErrors({});
  };

  const resolveTarget = async () => {
    if (!subjectId) {
      setErrors({ subjectId: "请先选择科目" });
      toast.error("请先选择科目");
      return null;
    }
    if (mode === "existing") {
      if (!existingSetId) {
        setErrors({ setId: "请选择要追加到的资料册" });
        toast.error("请选择要追加到的资料册");
        return null;
      }
      return { setId: existingSetId };
    }
    if (createdSetId.current) return { setId: createdSetId.current };
    const result = await createMaterialSetAction({
      subjectId,
      category,
      title: effectiveTitle,
      note,
    });
    if (!result.id) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error ?? "资料册没有建好，请重试");
      return null;
    }
    createdSetId.current = result.id;
    return { setId: result.id };
  };

  const onFinished = (summary: UploadSummary) => {
    const setId = mode === "existing" ? existingSetId : createdSetId.current;
    if (summary.failed > 0) {
      toast.error(`${summary.failed} 个文件没有传上去，可以点"重试"`);
    } else {
      toast.success(`已上传 ${summary.done} 个文件${summary.duplicate ? `，跳过 ${summary.duplicate} 个重复` : ""}`);
      setFinishedSetId(setId ?? null);
    }
    router.refresh();
  };

  const startNew = () => {
    createdSetId.current = null;
    setFinishedSetId(null);
    setTitle("");
    setTitleTouched(false);
    setNote("");
    setMode("new");
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-6">
        <Field label="科目" error={errors.subjectId}>
          <div role="radiogroup" aria-label="科目" className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5">
            {subjects.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={item.id === subjectId}
                onClick={() => pickSubject(item.id)}
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

        {subject ? (
          <>
            <div role="radiogroup" aria-label="上传方式" className="inline-flex rounded-lg bg-secondary p-1">
              {(
                [
                  ["new", "新建资料册"],
                  ["existing", "追加到已有资料册"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  disabled={value === "existing" && subjectSets.length === 0}
                  onClick={() => setMode(value)}
                  className={cn(
                    "h-9 rounded-md px-3.5 text-[0.9375rem] transition-colors duration-150 disabled:opacity-40",
                    mode === value ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(20,22,26,0.08)]" : "text-ink-2",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "new" ? (
              <div className="space-y-5">
                <Field label="类别">
                  <div role="radiogroup" aria-label="类别" className="flex flex-wrap gap-2">
                    {MATERIAL_CATEGORIES.map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={category === value}
                        onClick={() => setCategory(value)}
                        className={cn(
                          "h-10 rounded-lg border px-4 text-[0.9375rem] transition-colors duration-150",
                          category === value
                            ? "border-brand bg-brand-tint font-medium text-brand"
                            : "border-rule-strong bg-surface text-ink hover:border-ink-3",
                        )}
                      >
                        {materialCategoryLabel(value)}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field
                  label="标题"
                  htmlFor="set-title"
                  hint="老师和家长会看到这个标题，例如：七年级上册课本 第三章"
                  error={errors.title}
                >
                  <input
                    id="set-title"
                    className="field"
                    value={effectiveTitle}
                    onChange={(event) => {
                      setTitleTouched(true);
                      setTitle(event.target.value);
                    }}
                    maxLength={80}
                  />
                </Field>
                <Field label="备注（可选）" htmlFor="set-note" error={errors.note}>
                  <textarea
                    id="set-note"
                    className="field min-h-20"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="例如：老师要求周五前看完"
                    maxLength={1000}
                  />
                </Field>
              </div>
            ) : (
              <Field label="资料册" htmlFor="existing-set" error={errors.setId}>
                <select
                  id="existing-set"
                  className="field"
                  value={existingSetId ?? ""}
                  onChange={(event) => setExistingSetId(Number(event.target.value) || undefined)}
                >
                  <option value="">请选择</option>
                  {subjectSets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {materialCategoryLabel(set.category)}：{set.title}（{set.fileCount} 个文件）
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </>
        ) : (
          <p className="text-ink-3">先选科目，再选择照片。</p>
        )}
      </div>

      <div>
        {finishedSetId ? (
          <div className="rounded-lg border border-rule bg-surface p-5">
            <p className="flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 className="size-5" />
              上传完成
            </p>
            <p className="mt-2 text-ink-2">老师和家长现在打开链接就能看到这份资料。</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/materials/${finishedSetId}`}>看看家长端效果</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/materials/${finishedSetId}`}>调整顺序或删除</Link>
              </Button>
              <NotifyButton kind="set" id={finishedSetId} />
              <Button type="button" variant="ghost" size="sm" onClick={startNew}>
                再传一份
              </Button>
            </div>
          </div>
        ) : null}
        <div className={cn(finishedSetId && "mt-6")}>
          <Uploader
            key={finishedSetId ?? "uploader"}
            resolveTarget={resolveTarget}
            onFinished={onFinished}
            disabledReason={subject ? undefined : "请先在左边选择科目"}
          />
        </div>
      </div>
    </div>
  );
}
