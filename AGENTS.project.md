# 折页 Folio

技术向中文独立博客。Agent 指南，不是给人看的 README。改代码前读完。

根目录 `AGENTS.md` 是沙箱运行时契约，**禁止覆盖或删改**。本文件只约束折页产品。

前台公开阅读。登录用户可评论、开通会员看付费文。写稿只在控制台，只有管理员。不要做用户投稿，不要 author / editor 角色。

## Setup commands

- Install deps: `bun install`（工作区通常已装好，先读 `package.json`）
- Start: `bun run dev`（唯一允许的开发启动；经 `scripts/with-app-env.mjs`）
- Typecheck: `bun run typecheck`
- Tests: `bun test` 或 `bun run test`
- Lint: `bun run lint`
- Auth invariant: `bun run check:auth`
- Production build: `bun run build`，成功后再 `bun run preview:restart`
- Self-host upgrade: `./scripts/update-from-release.sh`

不要直接跑 `vite`。锁文件是 `bun.lock`，不要再生成 `package-lock.json`。

## Dev environment tips

- 预览必须听 `0.0.0.0:8080`。改启动命令先同步 `/workspace/startup.sh`。
- 有 `DATABASE_URL` 用 Neon Postgres，否则 PGLite。不要新建 `.env`，不要把密钥写进源码。
- 路由是文件路由：`src/routes/posts.$slug.tsx`、`tags.$tag.tsx`、`rss[.]xml.ts`。`src/routeTree.gen.ts` 由插件生成，不要手改。
- 新页面放 `src/routes/`，不要放 `server/` 或 `app/`。
- 分类可自定义，存在 `site_settings`（`src/lib/topics/`），不要再写死 `TOPICS` 常量当唯一来源。
- 控制台在 `/console`，个人中心在 `/me`。管理员才能进控制台和写文章（`/console?section=write`）。
- 控制台菜单不要跳前台展示页。前台入口用「访问博客」（新标签）。对象存储在 **系统 → 设置**，备份只在 **系统 → 备份**。
- 控制台表单静默自动保存，不要加保存按钮。
- 占位文案只写怎么用，不要写技术语法说明书。

## Architecture

```
src/routes/              文件路由。页面用 createFileRoute，数据用 loader
src/components/          站点壳 + 业务组件；shadcn 只放 src/components/ui/
src/components/console/  控制台（Halo 壳、表格、写稿）
src/lib/<feature>/       能力模块：server.ts 导出 createServerFn
src/lib/blog/            文章：types / server / seed / markdown / highlight / wiki
src/lib/hono/            HTTP API（Hono：MCP / Obsidian / 公开文章 / 附件）
src/lib/mcp/             Agent MCP 协议与工具
src/styles.css           唯一 token 源（@theme + :root / .dark / [data-theme]）
migrations/000*.sql      递增 schema；0001_auth.sql 勿改
public/obsidian-folio/   Obsidian 插件
```

| 模块 | 职责 |
| --- | --- |
| `blog` | 文章 CRUD、归档、种子、标签、站点 chrome |
| `comments` / `likes` | 嵌套评论、点赞、浏览计数 |
| `moments` / `photos` / `links` | 瞬间、图库、友链；前台显示由 `pages` 开关控制 |
| `attachments` / `storage` | 图片上传。有完整 S3 配置则写对象存储并回写公开 URL |
| `topics` | 自定义分类；编辑器 `[[` 按 Obsidian 方式补全 |
| `obsidian` | PAT、YAML 同步、插件包 |
| `hono` | `/api/*`：secure-headers、公开文章 JSON、附件 |
| `mcp` | Streamable HTTP，协议只认 2026-07-28；无会话、无 initialize，入口 `server/discover`
| `roles` | 只有 `admin` / `reader`。第一人 admin，其余用户 |
| `membership` | 月卡 / 年卡 / 连续包月 8 折；兑换码可删、天数可自定义 |
| `entrance` | 后台入口 cookie；空=关 |
| `backup` | 整站 JSON。控制台「备份」 |
| `updates` | 设置里自动更新开关，检查 GitHub Release |
| `theme` | 内置皮肤。前台布局横卡/方格/头条/目录存在 localStorage `folio-layout`。不要做前台「全部主题」页 |

- 读：公开 `createServerFn({ method: "GET" })`，不要挂 `authMiddleware`。
- 写：`.middleware([authMiddleware])`，用 `context.userId`，禁止客户端传来的 user id。Obsidian / MCP 走 PAT（`folio_`）和 `requireApiUserId`。
- 入参 zod。SQL 用 `getSql()` tagged template 或 `.query($1, …)`，禁止拼 SQL。
- 角色判断走 `getActor`。种子文章在 `src/lib/blog/seed.ts`，按 slug upsert。

## Code style

- TypeScript 严格模式。函数组件，具名导出。路径别名 `@/`。
- server-only 用 `*.server.ts`，不要从客户端 import。
- 三处以内的重复可以内联。不要为一次操作用建 helpers，不要加以后可能用到的配置和兼容垫片。
- 只改碰过的代码。不要顺手重构无关文件。
- 用户可见字符串用中文。不要在同一句 UI 里中英混写。
- Tailwind v4 + shadcn。颜色只来自 `src/styles.css` token。控制台按钮用 console token（`--color-console-brand`），不要吃前台主题的 `--primary`。
- 图标用 `lucide-react`。动效 150–300ms，尊重 `prefers-reduced-motion`。
- 代码块永远深色（`--code*`）。不要为高亮引入 Shiki / highlight.js，除非用户明确要求。
- Markdown 方言在 `src/lib/blog/markdown.tsx`。双链 `[[slug]]` / `[[标题#小节]]` / `[[slug|显示名]]`，解析在 `wikilink.ts`。单独一行的视频链接（YouTube / B 站 / Vimeo / 优酷 / TED / mp4）变成播放器，解析在 `video-embed.ts`。

## Testing instructions

```bash
bun run typecheck
bun run test
bun run check:auth
```

- CI 工作流在 `.github/workflows/`。提交前 typecheck + 相关测试要绿。
- 行为变了就补测试，靠近现有 `src/lib/**/*.test.ts` 和 `scripts/**/*.test.mjs`。
- 不要为常量或已删除的逻辑写负向测试。
- 对用户可见的改动：开发服保持 `0.0.0.0:8080`；`node scripts/browser-smoke.mjs`；看截图不要只看 JSON；交互用 `agent-browser`，不要手写 Playwright 脚本。
- `bun run build` 通过后 `bun run preview:restart`，再对构建结果跑一次 smoke。

## PR instructions

- 标题：`<scope>: <中文或英文简述>`，例如 `console: 文章表格支持筛选翻页`。
- 提交前跑 `bun run typecheck` 和 `bun run test`。
- 只包含这次需求。不要顺手改 README 里未要求的功能列表，除非产品事实已经变了。
- 发版：GitHub Release `v*` tag → GHCR。不要把沙箱 `AGENTS.md` 写进产品说明。

## Security

- Auth 开。登录页可注册。新用户默认 `reader`。写稿和控制台只给 `admin`。
- 文章软删 `deleted_at`，公开查询必须排除。付费文没权限时服务器只下发预览。
- 不要在公开 server function 里清空表或批量覆盖。
- MCP / Obsidian 令牌用 HMAC v2，防爆破限流。不要把令牌写进日志或前端源码。
- 生产 PGLite 需要 `pglite.data` / `pglite.wasm` / `initdb.wasm`；预览挂了先查这个。

## Never

- 覆盖根目录 `AGENTS.md`、`startup.sh`、`vite.config.ts` 整体、`public/__grok/`、`server/middleware/grok-pwa.ts`、`scripts/grok-pwa-*`
- 在 `__root.tsx` 里写 `og:*` / `twitter:card`
- 去掉 `PreviewHostBridge` 或 Grok 品牌条
- 新建 `src/routes/auth/popup.tsx`
- 换栈、换框架
- 在 JSX 里堆渐变 blob、lorem、占位灰块
- 对外文案写「参考 / 对齐 / 模仿」其他产品
