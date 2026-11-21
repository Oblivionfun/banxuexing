#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  api,
  ensureMaterialSet,
  getContext,
  scanFolder,
  ToolError,
  uploadFile,
  type UploadTarget,
} from "./api.js";

const GUIDE = `伴学星管理端 MCP 使用规则：
- 日期用 YYYY-MM-DD，时间用 HH:mm，全部按北京时间。
- 上传前先调用 get_context / list_subjects / list_material_sets，确认科目和资料册。
- 不确定传到哪个资料册时，用 ensure_material_set；它会复用同名资料册。
- 上传只读取 BXX_UPLOAD_ROOTS 里的文件，先用 scan_folder 看清单再传。
- 排课先调用 propose_schedule，把结果给工作人员确认；确认后调用 create_lessons 并传 confirm: true。
- 有冲突时必须由工作人员明确同意，才传 allowOverlap: true。
- 不要删除任何内容；删除只能在管理端由工作人员操作。
- 上传/建课都会写入操作记录，actor 显示为 AI。`;

const CATEGORIES = ["textbook", "paper", "exam", "homework", "notes", "other"] as const;

type TextResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function text(data: unknown): TextResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function failure(error: unknown): TextResult {
  const message = error instanceof Error ? error.message : "执行失败";
  const hint = error instanceof ToolError && error.hint ? `\n${error.hint}` : "";
  return { isError: true, content: [{ type: "text", text: `${message}${hint}` }] };
}

async function safe(fn: () => Promise<unknown>): Promise<TextResult> {
  try {
    return text(await fn());
  } catch (error) {
    return failure(error);
  }
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const value = search.toString();
  return value ? `?${value}` : "";
}

const server = new McpServer({ name: "banxuexing", version: "0.1.0" });

server.registerTool(
  "get_context",
  {
    title: "读取管理端上下文",
    description:
      "先调用这个工具。返回学生、今天日期、科目、资料类别、最近资料册、上传限制和允许读取的本地目录。",
    inputSchema: {},
  },
  () => safe(getContext),
);

server.registerTool(
  "list_subjects",
  {
    title: "列出科目",
    description: "返回科目 ID、名称、老师、每周节数和每节时长。上传和排课都要先用它确认科目。",
    inputSchema: {},
  },
  () => safe(() => api("/api/mcp/subjects")),
);

server.registerTool(
  "list_material_sets",
  {
    title: "列出资料册",
    description: "按科目或类别查看已有资料册，避免把文件传到错误的册子。",
    inputSchema: {
      subject: z.union([z.string(), z.number()]).optional().describe("科目 ID、名称或 slug"),
      category: z.enum(CATEGORIES).optional(),
    },
  },
  ({ subject, category }) =>
    safe(() => api(`/api/mcp/material-sets${query({ subject, category })}`)),
);

server.registerTool(
  "list_lessons",
  {
    title: "列出课程",
    description: "按日期范围或科目查看课程，用来回答“这周有什么课”或排课前检查空档。",
    inputSchema: {
      from: z.string().optional().describe("YYYY-MM-DD，默认今天"),
      to: z.string().optional().describe("YYYY-MM-DD，默认七天后"),
      subject: z.union([z.string(), z.number()]).optional(),
    },
  },
  ({ from, to, subject }) =>
    safe(() => api(`/api/mcp/lessons${query({ from, to, subject })}`)),
);

server.registerTool(
  "get_lesson",
  {
    title: "读取一节课",
    description: "读取课程纪要、作业、课前计划和附件清单，只读。",
    inputSchema: { id: z.number().int().positive() },
  },
  ({ id }) => safe(() => api(`/api/mcp/lessons${query({ id })}`)),
);

server.registerTool(
  "propose_schedule",
  {
    title: "生成排课建议",
    description:
      "只读。根据学生和老师的可上课时间、已有课程，算出某一周的可行时间段。结果先给工作人员看，确认后再调用 create_lessons。",
    inputSchema: {
      weekStart: z.string().optional().describe("YYYY-MM-DD，这一周任意一天；默认今天所在周"),
      requests: z
        .array(
          z.object({
            subject: z.union([z.string(), z.number()]).describe("科目 ID、名称或 slug"),
            sessions: z.number().int().min(0).max(20).optional().describe("这一周排几节，默认科目设置"),
          }),
        )
        .optional()
        .describe("不传则按所有科目的每周节数生成"),
    },
  },
  ({ weekStart, requests }) =>
    safe(() =>
      api("/api/mcp/schedule/propose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ weekStart, requests }),
      }),
    ),
);

server.registerTool(
  "ensure_material_set",
  {
    title: "找到或新建资料册",
    description:
      "按科目 + 类别 + 标题查找资料册；没有才新建。标题不传时按“数学课本 11月21日”的格式生成。",
    inputSchema: {
      subject: z.union([z.string(), z.number()]).describe("科目 ID、名称或 slug"),
      category: z.enum(CATEGORIES),
      title: z.string().max(80).optional(),
    },
  },
  ({ subject, category, title }) =>
    safe(async () => ensureMaterialSet({ subject, category, title })),
);

server.registerTool(
  "scan_folder",
  {
    title: "查看本地文件夹",
    description:
      "只读。列出允许目录里的文件，用来决定上传哪些。不会上传，也不读取文件内容。",
    inputSchema: {
      path: z.string().describe("文件夹绝对路径，必须在 BXX_UPLOAD_ROOTS 里"),
      recursive: z.boolean().optional().describe("是否包含子文件夹，默认否"),
      extensions: z.array(z.string()).optional().describe("只保留这些扩展名，例如 ['jpg','pdf']"),
    },
  },
  ({ path, recursive, extensions }) =>
    safe(async () => ({
      root: path,
      files: await scanFolder(path, { recursive, extensions }),
    })),
);

server.registerTool(
  "upload_files",
  {
    title: "上传本地文件",
    description:
      "把本地文件逐个传到资料册或课程附件。目标可以给 setId / lessonId，或给 subject + category（会自动找到或新建资料册）。重复文件会跳过。",
    inputSchema: {
      paths: z.array(z.string()).min(1).max(50).describe("本地文件绝对路径"),
      setId: z.number().int().positive().optional(),
      lessonId: z.number().int().positive().optional(),
      subject: z.union([z.string(), z.number()]).optional(),
      category: z.enum(CATEGORIES).optional(),
      title: z.string().max(80).optional(),
    },
  },
  ({ paths, setId, lessonId, subject, category, title }) =>
    safe(async () => {
      if (setId && lessonId) throw new ToolError("setId 和 lessonId 只能选一个");
      if (!setId && !lessonId && (!subject || !category)) {
        throw new ToolError("请给 setId / lessonId，或给 subject + category");
      }

      const target: UploadTarget = { setId, lessonId };
      let materialSet: { id: number; created: boolean; title: string } | undefined;
      if (!setId && !lessonId) {
        materialSet = await ensureMaterialSet({ subject: subject as string | number, category: category as string, title });
        target.setId = materialSet.id;
      }

      const results = [];
      for (const filePath of paths) {
        try {
          const uploaded = await uploadFile(target, filePath);
          const data = uploaded.data as { duplicate?: boolean; id?: string; kind?: string };
          results.push({
            ok: true,
            path: uploaded.path,
            name: uploaded.name,
            size: uploaded.size,
            duplicate: Boolean(data?.duplicate),
            fileId: data?.id,
            kind: data?.kind,
          });
        } catch (error) {
          results.push({
            ok: false,
            path: filePath,
            error: error instanceof Error ? error.message : "上传失败",
          });
        }
      }

      return {
        target: materialSet ? { setId: materialSet.id, title: materialSet.title, created: materialSet.created } : target,
        done: results.filter((item) => item.ok && !("duplicate" in item && item.duplicate)).length,
        duplicates: results.filter((item) => item.ok && "duplicate" in item && item.duplicate).length,
        failed: results.filter((item) => !item.ok).length,
        files: results,
      };
    }),
);

server.registerTool(
  "create_lessons",
  {
    title: "按建议写入课程",
    description:
      "把 propose_schedule 的结果写入课表。必须先让工作人员确认，再传 confirm: true。有冲突时要工作人员明确同意，才传 allowOverlap: true。",
    inputSchema: {
      slots: z
        .array(
          z.object({
            subject: z.union([z.string(), z.number()]).describe("科目 ID、名称或 slug"),
            date: z.string().describe("YYYY-MM-DD"),
            startTime: z.string().describe("HH:mm"),
            endTime: z.string().describe("HH:mm"),
          }),
        )
        .min(1)
        .max(80),
      confirm: z.boolean().describe("工作人员确认后才传 true"),
      allowOverlap: z.boolean().optional(),
    },
  },
  ({ slots, confirm, allowOverlap }) =>
    safe(async () => {
      if (!confirm) {
        throw new ToolError(
          "还需要工作人员确认",
          "把 slots 和冲突情况给工作人员看，得到明确同意后再传 confirm: true",
        );
      }
      return api("/api/mcp/lessons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slots, confirm, allowOverlap }),
      });
    }),
);

server.registerResource(
  "guide",
  "banxuexing://guide",
  {
    title: "伴学星 MCP 使用规则",
    description: "日期格式、上传目标、排课确认和禁止操作。",
    mimeType: "text/plain",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, text: GUIDE, mimeType: "text/plain" }],
  }),
);

if (!process.env.BXX_MCP_TOKEN) {
  console.error("[banxuexing-mcp] 缺少 BXX_MCP_TOKEN，无法启动");
  process.exit(1);
}
if (!process.env.BXX_UPLOAD_ROOTS) {
  console.error("[banxuexing-mcp] 没有配置 BXX_UPLOAD_ROOTS，只能做查询，不能上传文件");
}

async function main() {
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error("[banxuexing-mcp] 启动失败", error);
  process.exit(1);
});
