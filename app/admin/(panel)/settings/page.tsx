import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { CopyButton } from "@/components/admin/buttons";
import { FormSection } from "@/components/admin/field";
import { PageHeader } from "@/components/admin/page-header";
import { shareUrl } from "@/lib/auth";
import { dataDir } from "@/lib/db";
import { getEnv, isAiConfigured } from "@/lib/env";
import { getSetting, getStudent } from "@/lib/queries";
import { formatDateTime } from "@/lib/time";
import { StudentForm, WebhookForm } from "./settings-forms";

export const metadata: Metadata = { title: "设置" };

function latestBackup(): Date | null {
  const dir = path.join(dataDir(), "backups");
  if (!fs.existsSync(dir)) return null;
  const times = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".db"))
    .map((name) => fs.statSync(path.join(dir, name)).mtime);
  return times.length ? new Date(Math.max(...times.map((time) => time.getTime()))) : null;
}

export default function SettingsPage() {
  const student = getStudent();
  const link = shareUrl();
  const env = getEnv();
  const backup = latestBackup();

  return (
    <>
      <PageHeader title="设置" />
      <div className="max-w-2xl space-y-10">
        <FormSection title="学生信息">
          <StudentForm initial={{ name: student.name, grade: student.grade, intro: student.intro }} />
        </FormSection>

        <FormSection
          title="查看链接"
          description="家长和老师用这个链接打开学习档案。如果链接被转给了不相关的人，可以让技术同事更换服务器上的 SHARE_TOKEN，旧链接会立即失效。"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 truncate rounded-md bg-paper px-3 py-2 text-sm text-ink-2">{link}</code>
            <CopyButton value={link} />
          </div>
          {!env.SITE_URL ? (
            <p className="text-sm text-warning">服务器还没有配置 SITE_URL，链接里的域名可能不对。</p>
          ) : null}
        </FormSection>

        <FormSection
          title="企业微信群机器人"
          description="设置后，课程纪要和新资料页面会出现“推送到企业微信群”按钮，一键把摘要和链接发到群里。"
        >
          <WebhookForm initial={getSetting("wecom_webhook") ?? ""} />
        </FormSection>

        <FormSection title="自动整理老师总结">
          <p className="text-ink-2">
            {isAiConfigured()
              ? `已接入大模型（${env.AI_MODEL}）。录入纪要时粘贴老师原文，会自动拆成本节内容、作业和下节准备。`
              : "当前按“作业”“下节课”等小标题自动拆分。如需更聪明的整理，可在服务器配置 AI_BASE_URL、AI_API_KEY、AI_MODEL。"}
          </p>
        </FormSection>

        <FormSection title="数据备份">
          <p className="text-ink-2">
            {backup
              ? `最近一次备份：${formatDateTime(backup)}。服务器每天凌晨自动备份数据库和上传文件。`
              : "还没有检测到备份。部署到服务器后，按部署说明开启每日自动备份。"}
          </p>
        </FormSection>
      </div>
    </>
  );
}
