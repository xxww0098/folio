# 折页 Folio

Agent 指南，不是给人看的 README。改代码前读完本文件。
根目录 `AGENTS.md` 是沙箱运行时契约，**禁止覆盖或删改**。本文件只约束折页产品本身。

## Product

技术向中文独立博客。栏目按语言/主题：`TypeScript` `Rust` `Go` `Python` `SQL` `Zig` `架构`。
公开阅读，登录后可投稿、评论、发瞬间、管附件。深色顶栏、横向封面卡、右侧边栏。

默认语气：工程师写给工程师。短句、可运行的代码、少口号。界面文案用中文。

不要把站点改回文学杂志，也不要引入 Agent 级双向 RPC。Web 层就是 TanStack Start 的 HTTP + `createServerFn`。

## Commands

```bash
npm run dev              # 唯一允许的开发启动方式（经 with-app-env）
npm run typecheck
npm run test
npm run lint
npm run build            # 生产构建；成功后再 npm run preview:restart
npm run check:auth       # 鉴权不变量
```

改完必须：`typecheck` 绿、相关页面在预览里能看见真实内容。涉及交互再用 `agent-browser` 点一遍。不要直接跑 `vite`。

## Layout

```
src/routes/              文件路由。页面用 createFileRoute，数据用 loader
src/components/          站点壳 + 业务组件；shadcn 只放 src/components/ui/
src/lib/<feature>/       能力模块：server.ts 导出 createServerFn
src/lib/blog/            文章核心：types / server / seed / markdown / highlight
src/lib/mcp/             Agent MCP（catalog / handler / ops），端点 /api/mcp
src/lib/theme/           内置皮肤 catalog + 应用/存储
src/styles.css           唯一 token 源（@theme + :root / .dark / [data-theme]）
migrations/000*.sql      递增 schema；auth 表在 0001_auth.sql，勿改
public/covers/           文章封面
public/obsidian-folio/   Obsidian 插件（manifest / main.js / styles.css）
```

路由约定：`posts.$slug.tsx`、`tags.$tag.tsx`、`rss[.]xml.ts`。新页面放 `src/routes/`，不要放 `server/` 或 `app/`。

`src/routeTree.gen.ts` 由插件生成，不要手改。

## Architecture

能力按模块挂载，不要做成巨石 `server.ts`：

| 模块 | 职责 |
| --- | --- |
| `blog` | 文章 CRUD、归档、种子、标签、站点 chrome |
| `comments` | 嵌套评论 |
| `likes` | 点赞 + 浏览计数 |
| `moments` | 瞬间 |
| `links` | 友链 |
| `photos` | 图库 |
| `attachments` | 附件 / 封面上传 |
| `obsidian` | PAT、YAML 笔记同步、插件包 |
| `mcp` | Agent 远程管理：Streamable HTTP JSON-RPC，复用 PAT |
| `theme` | 内置皮肤（地球 / 极夜 / 墨迹 / 终端 / 稿纸 / 雾面） |
| `roles` | author / editor / admin。个人站点只有一个账户 |
| `entrance` | 后台入口。Docker 首次启动 `scripts/ensure-init.mjs` 生成路径并打印到终端；空=关；`/$entry` 种 cookie |
| `backup` | 整站 JSON 快照。`scripts/backup.mjs`；控制台「备份」；CLI `export-db.mjs` / `import-db.mjs` |
| `storage` | 附件存储。默认 Postgres bytea；可选 S3 兼容对象存储。`scripts/object-storage.mjs`；控制台「存储」 |

- 读：公开 `createServerFn({ method: "GET" })`，不要挂 `authMiddleware`。
- 写：必须 `.middleware([authMiddleware])`，用 `context.userId`，禁止客户端传来的 user id。Obsidian / MCP 的 HTTP 路由走 PAT（`folio_`），用 `requireApiUserId`，不要在公开 URL 上挂写操作。
- 入参用 zod。SQL 用 `getSql()` 的 tagged template 或 `.query($1, …)`，禁止字符串拼 SQL。
- 列表/详情类型放 `src/lib/blog/types.ts`。角色判断走 `getActor`，不要在页面里硬编码 admin id。
- 种子文章在 `src/lib/blog/seed.ts`，`ensureSeeded` 按 slug upsert 编辑部稿。改示例内容就改 seed，不要手写 SQL 插演示数据。

## Data & auth

Auth **开**。Postgres：有 `DATABASE_URL` 用 Neon，否则 PGLite。

- 个人站点只有一个账户。Docker 首次启动 `scripts/ensure-admin.mjs` 创建 credential 管理员（可用 `FOLIO_ADMIN_EMAIL` / `FOLIO_ADMIN_PASSWORD` 覆盖）；已有用户则不改密码。登录页无公开注册。
- 登录用户第一人自动 `admin`，其余默认 `author`（自托管被单账户约束拦住）。editor 可改他人稿，admin 可改角色。
- 文章软删 `deleted_at`，公开查询必须排除。
- 不要新建 `.env`。不要把密钥写进源码。
- 不要在公开 server function 里做清空表、批量覆盖。
- 生产构建里 PGLite 需要 `pglite.data` / `pglite.wasm` / `initdb.wasm`；预览挂了先查这个，而不是改业务代码。

## Markdown

正文是站点自己的方言，不是任意 CommonMark。解析在 `src/lib/blog/markdown.tsx`，高亮在 `highlight.ts`，编辑器往返在 `html.ts`。

支持：

- `##` / `###`（目录只收这两级）
- `**bold**` `*em*` `` `code` `` `[text](url)`
- `-` 无序、`1.` 有序、`>` 引用、`---`、`![alt](url)`
- 围栏代码：

```
```ts:src/lib/blog/server.ts {3-5}
```

语言、`:filepath` 或 `title=`、`{1,3-5}` 高亮行。Diff 用 ` ```diff `。

双链（正文互引，解析在 `wikilink.ts`，渲染在 `markdown.tsx`）：

- `[[slug]]` / `[[标题]]` / `[[判别联合]]`（标题冒号前的短名，过短的英文不算）
- `[[slug#小节]]` `[[#本节标题]]` `[[slug#^block]]`
- `[[slug|显示名]]`
- 段落 / 列表 / 引用末尾 ` ^id` 作为块锚点
- 围栏和行内代码里的 `[[...]]` 不当链接
- 出链、反向链接、未链提及在阅读时扫描已发布正文计算，不另建表

加语言：改 `highlight.ts` 的 alias / keywords / comment style，并在 `LANGUAGE_OPTIONS` 里出现。不要为了高亮引入 Shiki / highlight.js，除非用户明确要求。

技术文章默认要有带语言的代码块。内联代码用现有 `<code>` 样式，不要再套一层 CodeBlock。

## UI

- Tailwind v4 + shadcn。颜色、圆角、字体只来自 `src/styles.css` 的 token。JSX 里不要写裸 hex、不要 `text-white` / `bg-black`。
- 字体：界面默认 Inter + Noto Sans SC；墨迹/稿纸标题用 Source Serif 4 + Noto Serif SC；终端标题用 JetBrains Mono；代码永远 `--font-mono`。
- 顶栏 `bg-header`，卡片 `bg-card shadow-md`，主列 + `18rem` 边栏。
- 语言名（分类）用 `font-mono text-xs`。
- 代码块永远深色（`--code*`），与站点亮/暗主题无关。皮肤可以改代码配色，但不能改成浅色代码块。
- 动效用 150–300ms，尊重 `prefers-reduced-motion`。
- 图标用 `lucide-react`，不要 emoji 当图标。
- 改外观先看 `design-ui` skill，再动 token，不要给单个页面开第二套视觉。
- 内置皮肤：`src/lib/theme/catalog.ts` + `src/styles.css` 的 `[data-theme]`。顶栏调色盘、`/themes`、控制台「外观」共用 `ThemeGallery` / `ThemeToggle`。选择存在 `localStorage`（`folio-skin` / `folio-mode`），不要做成账号设置。

## Code style

- TypeScript 严格模式。函数组件，具名导出。
- 路径别名 `@/`。server-only 模块用 `*.server.ts`，不要从客户端 import。
- 三处以内的重复可以保持内联；不要为一次操作用建 helpers。
- 不要加「以后可能用到」的配置项、feature flag、兼容垫片。
- 改你碰过的代码即可。不要顺手重构无关文件。
- 用户可见字符串用中文；标识符、git 信息、代码注释用英文也可以，但不要中英混在同一句 UI 里。

## Testing

```bash
npm run typecheck
npm run test
npm run check:auth
```

行为变了就补测试，靠近现有 `*.test.ts` / `scripts/**/*.test.mjs`。不要为常量或已删除的逻辑写负向测试。

预览验收（对用户可见的改动）：

1. 开发服保持在 `0.0.0.0:8080`
2. `node scripts/browser-smoke.mjs`（桌面 + 手机）
3. 看两张截图，不要只看 JSON
4. 交互用 `agent-browser`，不要手写 Playwright 脚本
5. `npm run build` 通过后 `npm run preview:restart`，再对构建结果跑一次 smoke

## Never

- 覆盖根目录 `AGENTS.md`、`startup.sh`、`vite.config.ts` 整体、`public/__grok/`、`server/middleware/grok-pwa.ts`、`scripts/grok-pwa-*`
- 在 `__root.tsx` 里写 `og:*` / `twitter:card`
- 去掉 `PreviewHostBridge` 或 Grok 品牌条
- 新建 `src/routes/auth/popup.tsx`
- 不要替换现有栈（用户要的是这个产品，不是再搭一套框架）
- 在 JSX 里堆渐变 blob、lorem、占位灰块
- 对外文案不要写「参考 / 对齐 / 模仿」其他产品

## Extending

| 需求 | 做法 |
| --- | --- |
| 新公开页 | `src/routes/foo.tsx` + `SiteShell`；列表数据走已有 chrome 或新 GET server fn |
| 新写能力 | `src/lib/<name>/server.ts`，mutation 挂 `authMiddleware` |
| 新分类 | `TOPICS`（`types.ts`）+ 至少一篇 seed |
| 新示例文 | `seed.ts` + `SEED_POST_TAGS` + 封面图 |
| 新代码语言 | `highlight.ts`，不要换渲染器 |
| 新表 | `migrations/000N_*.sql`，`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` |
| Obsidian 同步 | `src/lib/obsidian/` + `/api/obsidian/*`（PAT `folio_`）；插件源文件在 `public/obsidian-folio/`，zip 由客户端打包 |
| Agent MCP | `src/lib/mcp/` + `/api/mcp`（Streamable HTTP，同一 PAT）；说明页 `/mcp`；新工具加在 `catalog.ts` 并在 `ops.ts` 实现 |
| Docker / Release | `Dockerfile` + `docker-compose.yml`；版本来自 GitHub Release（`v*` tag → GHCR + Release）；升级跑 `scripts/update-from-release.sh` |
| 后台入口 | `src/lib/entrance/` + `migrations/0008_entrance.sql`；Docker 首次启动 `scripts/ensure-init.mjs` 生成入口并打印到终端；空字符串关闭；`/$entry` 解锁并写 `folio_entrance`；公开页、`/login`、MCP / Obsidian PAT 不拦 |
| 站长账户 | `scripts/ensure-admin.mjs` + `migrations/0009_single_user.sql`；无 `DATABASE_URL` 跳过；密码按 Better Auth scrypt 写入 `account`；登录页只登录不注册 |
| 备份 / 搬家 | `scripts/backup.mjs` + 控制台「备份」；导出 JSON（含附件 bytea）；导入覆盖全站，跳过 session；CLI 同格式 |
| 新皮肤 | `catalog.ts` 加一项 + `styles.css` 写 light/dark 两套 token；预览色只放 catalog swatch |

做完对照：公开页仍可未登录浏览；作者只能改自己的稿；代码块有语言标签且可复制。
