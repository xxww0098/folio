export type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type PromptDef = {
  name: string;
  description: string;
  arguments: Array<{ name: string; description: string; required: boolean }>;
};

const stringProp = (description: string) => ({ type: "string", description });

export const MCP_TOOLS: ToolDef[] = [
  {
    name: "whoami",
    description: "当前令牌对应的用户、角色，以及站点栏目列表。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_posts",
    description: "列出当前用户可管理的文章（作者看自己的，编辑/管理员看全部）。",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["draft", "published"], description: "按状态过滤" },
        topic: stringProp("按栏目过滤，如 TypeScript、Rust"),
        q: stringProp("标题、摘要或别名里的关键词"),
        includeTrash: { type: "boolean", description: "是否包含回收站" },
        limit: { type: "integer", minimum: 1, maximum: 100, description: "默认 40" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_post",
    description: "按 slug 或数字 id 读取完整 Markdown（含 YAML 头信息）。",
    inputSchema: {
      type: "object",
      properties: {
        slug: stringProp("文章别名"),
        id: { type: "integer", description: "文章数字 id" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "search_posts",
    description: "在可管理文章的标题、摘要、别名中搜索。",
    inputSchema: {
      type: "object",
      required: ["q"],
      properties: {
        q: stringProp("关键词"),
        limit: { type: "integer", minimum: 1, maximum: 50, description: "默认 20" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "publish_post",
    description:
      "用 Markdown 发布或更新文章。同一 slug 再次推送会覆盖并留下版本。YAML 头可含 title、slug、topic、tags、status、access（public|early|paid）、exclusiveDays、cover、excerpt。status 缺省为 published。",
    inputSchema: {
      type: "object",
      required: ["markdown"],
      properties: {
        markdown: stringProp("完整 Markdown，建议带 YAML 头"),
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_post",
    description: "按 slug 局部更新标题、正文、栏目、标签、状态或阅读权限，不必重传全文。",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: {
        slug: stringProp("文章别名"),
        title: stringProp("新标题"),
        excerpt: stringProp("摘要"),
        body: stringProp("正文（不含 YAML 头）"),
        topic: stringProp("栏目"),
        tags: { type: "array", items: { type: "string" }, description: "标签列表" },
        status: { type: "string", enum: ["draft", "published"] },
        access: { type: "string", enum: ["public", "early", "paid"], description: "阅读权限" },
        exclusiveDays: { type: "integer", minimum: 1, maximum: 365, description: "抢先天数，仅 access=early 有意义" },
        cover: stringProp("封面 URL"),
      },
      additionalProperties: false,
    },
  },
  {
    name: "set_post_status",
    description: "把文章设为已发布或草稿。",
    inputSchema: {
      type: "object",
      required: ["slug", "status"],
      properties: {
        slug: stringProp("文章别名"),
        status: { type: "string", enum: ["draft", "published"] },
      },
      additionalProperties: false,
    },
  },
  {
    name: "delete_post",
    description: "把文章移入回收站（软删除）。",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: { slug: stringProp("文章别名") },
      additionalProperties: false,
    },
  },
  {
    name: "restore_post",
    description: "从回收站恢复文章。",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: { slug: stringProp("文章别名") },
      additionalProperties: false,
    },
  },
  {
    name: "list_topics",
    description: "列出站点栏目，写文章时 topic 必须是其中之一。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_revisions",
    description: "列出一篇文章最近的版本快照。",
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: { slug: stringProp("文章别名") },
      additionalProperties: false,
    },
  },
  {
    name: "upload_image",
    description: "上传封面或正文配图。传入文件名和 Base64（可带 data: 前缀）。返回站点相对路径与绝对 URL。",
    inputSchema: {
      type: "object",
      required: ["filename", "dataBase64"],
      properties: {
        filename: stringProp("文件名，如 cover.png"),
        mimeType: stringProp("image/jpeg、image/png、image/webp 或 image/gif"),
        dataBase64: stringProp("图片 Base64"),
        alt: stringProp("替代文本"),
      },
      additionalProperties: false,
    },
  },
];

export const MCP_PROMPTS: PromptDef[] = [
  {
    name: "draft_technical_post",
    description: "按折页的技术博客口径起草一篇 Markdown 文章，带 YAML 头和代码围栏。",
    arguments: [
      { name: "topic", description: "栏目，如 TypeScript / Rust / Go", required: true },
      { name: "title", description: "标题", required: true },
      { name: "thesis", description: "文章要讲清的一件事", required: false },
    ],
  },
  {
    name: "revise_post",
    description: "根据指令改写已有文章，保持 YAML 头与代码围栏格式。",
    arguments: [
      { name: "slug", description: "要改的文章别名", required: true },
      { name: "instruction", description: "怎么改", required: true },
    ],
  },
];

export function toolByName(name: string) {
  return MCP_TOOLS.find((tool) => tool.name === name);
}

export function promptByName(name: string) {
  return MCP_PROMPTS.find((prompt) => prompt.name === name);
}
