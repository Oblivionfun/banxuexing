import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/admin/buttons";
import { AttachUploader } from "@/components/admin/attach-uploader";
import { AdminFileList } from "@/components/admin/file-list";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { materialCategoryLabel } from "@/lib/labels";
import { getMaterialSet, listSubjects } from "@/lib/queries";
import { formatDateTime } from "@/lib/time";
import { deleteMaterialSetAction } from "../../../actions";
import { NotifyButton } from "../../notify-button";
import { SetForm } from "./set-form";

export const metadata: Metadata = { title: "编辑资料册" };

export default async function EditMaterialSetPage({ params }: PageProps<"/admin/materials/[id]">) {
  const { id } = await params;
  const found = getMaterialSet(Number(id));
  if (!found) notFound();
  const { set, subject, files } = found;

  return (
    <>
      <PageHeader
        title={set.title}
        description={`${subject.name}${materialCategoryLabel(set.category)}，${files.length} 个文件`}
        back={{ href: "/admin/materials", label: "全部资料册" }}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/materials/${set.id}`}>
                <ExternalLink />
                家长端效果
              </Link>
            </Button>
            {files.length > 0 ? <NotifyButton kind="set" id={set.id} notifiedAt={set.notifiedAt} /> : null}
          </>
        }
      />
      {set.notifiedAt ? (
        <p className="-mt-5 mb-6 text-sm text-ink-3">上次推送到群：{formatDateTime(set.notifiedAt)}</p>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <SetForm
          setId={set.id}
          subjects={listSubjects().map(({ id: sid, name }) => ({ id: sid, name }))}
          initial={{ subjectId: set.subjectId, category: set.category, title: set.title, note: set.note }}
        />
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 font-semibold text-ink">文件（按家长看到的顺序）</h2>
            <AdminFileList files={files} />
          </div>
          <div>
            <h2 className="mb-3 font-semibold text-ink">追加文件</h2>
            <AttachUploader target={{ setId: set.id }} startLabel="追加上传" />
          </div>
        </div>
      </div>

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="text-lg font-semibold text-ink">删除资料册</h2>
        <p className="mt-1 text-sm text-ink-3">连同里面的文件一起进入回收站，需要时可以恢复。</p>
        <div className="mt-4">
          <ActionButton
            action={deleteMaterialSetAction.bind(null, set.id)}
            variant="destructive"
            confirm={{
              title: `删除「${set.title}」？`,
              description: "老师和家长将看不到这份资料。可以在回收站恢复。",
              confirmText: "删除",
            }}
          >
            <Trash2 />
            删除资料册
          </ActionButton>
        </div>
      </section>
    </>
  );
}
