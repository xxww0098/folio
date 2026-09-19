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
    description: "列出当前用户可管理的文章。管理员看全部。",
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
    name: "draft_post",
    description:
      "把 Markdown 存为草稿。前台不可见，可在控制台继续改。同一 slug 再次调用会覆盖草稿。YAML 头可含 title、slug、topic、tags、access、cover、excerpt。status 一律为 draft。写完要上线请再调用 publish_post 或 set_post_status。",
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
    name: "publish_post",
    description:
      "正式发布 Markdown 到前台。同一 slug 再次推送会覆盖并留下版本。草稿请用 draft_post。YAML 头可含 title、slug、topic、tags、status、access（public|early|paid）、exclusiveDays、cover、excerpt。不写 status 时按已发布处理。",
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
    description: "把已有文章设为草稿或正式发布，不必重传正文。",
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
    description: "列出当前站点分类。写文章时 topic 必须是其中之一。",
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
  {
    name: "site_overview",
    description: "站点总览：文章数量、评论、用户、瞬间、前台栏目开关、分类。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_comments",
    description: "列出最近评论，或按文章 slug 过滤。",
    inputSchema: {
      type: "object",
      properties: {
        slug: stringProp("只看这篇文章的评论"),
        limit: { type: "integer", minimum: 1, maximum: 80, description: "默认 30" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "add_comment",
    description: "以当前令牌用户发表或回复评论。文章须已发布。",
    inputSchema: {
      type: "object",
      required: ["body"],
      properties: {
        slug: stringProp("文章别名，与 postId 二选一"),
        postId: { type: "integer", description: "文章数字 id" },
        body: stringProp("评论正文，2–1000 字"),
        parentId: { type: "integer", description: "回复哪条评论" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "delete_comment",
    description: "删除一条评论。管理员可删任意，其他人只能删自己的。",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "integer", description: "评论 id" } },
      additionalProperties: false,
    },
  },
  {
    name: "list_moments",
    description: "列出站点瞬间，按时间倒序。",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 40, description: "默认 20" } },
      additionalProperties: false,
    },
  },
  {
    name: "create_moment",
    description: "发一条瞬间，最多 280 字。",
    inputSchema: {
      type: "object",
      required: ["body"],
      properties: { body: stringProp("瞬间正文") },
      additionalProperties: false,
    },
  },
  {
    name: "delete_moment",
    description: "删除一条瞬间。仅管理员。",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "integer" } },
      additionalProperties: false,
    },
  },
  {
    name: "list_links",
    description: "列出全部友链，含分组。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_link",
    description: "添加友链。仅管理员。",
    inputSchema: {
      type: "object",
      required: ["name", "url"],
      properties: {
        name: stringProp("站点名"),
        url: stringProp("https 地址"),
        description: stringProp("一句话"),
        groupName: stringProp("分组，默认 阅读"),
      },
      additionalProperties: false,
    },
  },
  {
    name: "delete_link",
    description: "删除友链。仅管理员。",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "integer" } },
      additionalProperties: false,
    },
  },
  {
    name: "list_photos",
    description: "列出图库里的图片。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_photo",
    description: "把已上传的图片加入图库。image 用 upload_image 返回的 URL。仅管理员。",
    inputSchema: {
      type: "object",
      required: ["title", "image"],
      properties: {
        title: stringProp("标题"),
        image: stringProp("图片 URL"),
        description: stringProp("说明"),
        groupName: stringProp("分组，默认 日常"),
      },
      additionalProperties: false,
    },
  },
  {
    name: "list_pages",
    description: "前台栏目开关：瞬间、图库、归档、友链。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "set_front_page",
    description: "打开或关闭某个前台栏目。仅管理员。",
    inputSchema: {
      type: "object",
      required: ["page", "visible"],
      properties: {
        page: { type: "string", enum: ["moments", "photos", "archive", "links"] },
        visible: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "add_topic",
    description: "新增分类。仅管理员。",
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: { name: stringProp("分类名，最多 20 字") },
      additionalProperties: false,
    },
  },
  {
    name: "get_revision",
    description: "读取文章某个历史版本的正文。",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "integer", description: "list_revisions 返回的版本 id" } },
      additionalProperties: false,
    },
  },
];

export const MCP_PROMPTS: PromptDef[] = [
  {
    name: "draft_technical_post",
    description: "按折页口径起草一篇 Markdown 草稿（status: draft），带 YAML 头和代码围栏。写完应调用 draft_post，不要直接发布。",
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
  {
    name: "reply_to_comment",
    description: "根据最近评论起草一条回复，写完调用 add_comment。",
    arguments: [
      { name: "slug", description: "文章别名", required: true },
      { name: "commentId", description: "要回复的评论 id", required: false },
    ],
  },
  {
    name: "write_moment",
    description: "把一件工程上的小事写成瞬间（不超过 280 字），写完调用 create_moment。",
    arguments: [{ name: "note", description: "发生了什么", required: true }],
  },
];

export function toolByName(name: string) {
  return MCP_TOOLS.find((tool) => tool.name === name);
}

export function promptByName(name: string) {
  return MCP_PROMPTS.find((prompt) => prompt.name === name);
}
