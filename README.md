# 折页 Folio

写给工程师的独立博客。栏目按语言分：TypeScript、Rust、Go、Python、SQL、Zig、架构。正文带可运行的代码围栏、双链互引、会员抢先阅读，以及给写作 Agent 用的 MCP 接口。

[![MIT License](https://img.shields.io/badge/license-MIT-0f766e)](./LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/xxww0098/folio?include_prereleases&label=release)](https://github.com/xxww0098/folio/releases)
[![GHCR](https://img.shields.io/badge/ghcr.io-xxww0098%2Ffolio-111827)](https://github.com/xxww0098/folio/pkgs/container/folio)

**仓库：** [github.com/xxww0098/folio](https://github.com/xxww0098/folio)  
**镜像：** `ghcr.io/xxww0098/folio`  
**许可证：** MIT

![折页首页](docs/home.png)

## 功能

- 技术向 Markdown：语言标签、文件名、行号、高亮行、Diff、一键复制
- 双链：`[[slug]]` / `[[标题#小节]]` / `[[slug#^block|显示名]]`，阅读页给出链和反向链接
- 会员：公开 / 抢先 N 天 / 专享；没权限时服务器只下发预览，正文不会下到浏览器
- 附件、回收站、文章版本、角色（作者 / 编辑 / 管理员）
- Obsidian 插件：个人令牌发布、拉回、上传图片
- MCP：写作 Agent 远程列稿、改稿、推送（`/api/mcp`，同一类 `folio_` 令牌）
- 六套内置主题，顶栏切换

## 用 Docker 自托管

需要 [Docker Compose v2](https://docs.docker.com/compose/)。第一次可以从源码构建；之后版本跟着 **GitHub Release** 走。

### 1. 第一次启动

```sh
git clone https://github.com/xxww0098/folio.git
cd folio
cp .env.example .env
```

编辑 `.env`：

| 变量 | 说明 |
| --- | --- |
| `BETTER_AUTH_URL` | 浏览器访问的 origin。本机 `http://localhost:8080`，公网请用 `https://你的域名` |
| `BETTER_AUTH_SECRET` | 会话签名密钥，生产用 `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | 数据库密码，不要包含 `@ : / # ?` |
| `FOLIO_PORT` | 宿主机端口，默认 `8080` |
| `FOLIO_VERSION` | 镜像 tag。第一次可保持 `latest` |

```sh
docker compose up -d --build
```

打开 `BETTER_AUTH_URL`。第一次注册的邮箱账号自动成为管理员。

生产请把站点放在 HTTPS 反向代理后面。会话 Cookie 用 `__Host-` 前缀：本机 `localhost` 可以用 HTTP，公网必须 HTTPS。

Caddy 示例：

```caddy
blog.example.com {
  reverse_proxy 127.0.0.1:8080
}
```

只备份 Docker volume `folio-db` 即可（文章、会员、附件都在 Postgres 里）。

### 2. 从 GitHub Release 升级

新版本以 GitHub Release 发布（tag `v*`），同时打出多架构镜像：

`ghcr.io/xxww0098/folio:<tag>`（`linux/amd64`、`linux/arm64`）

```sh
./scripts/update-from-release.sh          # 读最新 Release，拉取并重启
./scripts/update-from-release.sh --check  # 只看有没有新版本
```

脚本会把 `.env` 里的 `FOLIO_VERSION` 写成最新 tag，再 `docker compose pull && up`。指定版本：

```sh
FOLIO_VERSION=v0.1.0 docker compose pull folio
FOLIO_VERSION=v0.1.0 docker compose up -d
```

控制台页会显示当前版本；GitHub 上有更新时会提示跑上面的脚本。

没有克隆仓库、只拿 Compose 文件也可以：

```sh
mkdir folio && cd folio
curl -fsSO https://raw.githubusercontent.com/xxww0098/folio/main/docker-compose.yml
curl -fsSO https://raw.githubusercontent.com/xxww0098/folio/main/.env.example
cp .env.example .env
# 编辑 .env，把 FOLIO_VERSION 写成某个 Release tag
docker compose up -d
```

如果 `docker pull` 提示未授权，到 [GHCR 包装页](https://github.com/xxww0098/folio/pkgs/container/folio) 把可见性设为 Public。

### 3. 发布新版本（维护者）

```sh
git tag v0.1.1
git push origin v0.1.1
```

推送 `v*` 标签后，GitHub Actions 会：构建 `amd64` / `arm64` 镜像 → 推送到 GHCR → 创建 GitHub Release。

## 本地开发

需要 Node.js 22。

```sh
npm ci
VITE_AUTH_ENABLED=true VITE_FOLIO_EMAIL_PASSWORD=true npm run dev
```

开发服默认 `0.0.0.0:8080`。不设 `DATABASE_URL` 时用内嵌 PGLite；设了则连 Postgres。

```sh
npm run typecheck
npm run test
```

## 环境变量

| 变量 | 何时生效 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 运行时 | Postgres 连接串。Compose 会自动注入。 |
| `BETTER_AUTH_URL` | 运行时 | 站点对外 origin |
| `BETTER_AUTH_SECRET` | 运行时 | 会话签名密钥 |
| `VITE_AUTH_ENABLED` | **构建时** | `"true"` 打开登录 |
| `VITE_FOLIO_EMAIL_PASSWORD` | **构建时** | `"true"` 打开邮箱注册 / 登录（自托管镜像默认打开） |
| `VITE_FOLIO_VERSION` | **构建时** | 写入前端的版本号，发 Release 时由 CI 填入 |
| `FOLIO_VERSION` | Compose | 镜像 tag |
| `FOLIO_PORT` | Compose | 宿主机端口，默认 8080 |

Vite 变量在构建时打进前端，改它们必须重新 `docker compose build`。不要把密钥写进源码或提交 `.env`。

## 写作接口

### Obsidian

控制台签发个人令牌（`folio_` 开头），下载插件包放到库的 `.obsidian/plugins/folio/`。命令：发布、拉取、上传图片。说明页：`/obsidian`。

### Agent / MCP

Streamable HTTP 端点：`POST /api/mcp`  
请求头：`Authorization: Bearer folio_…`

Cursor 示例：

```json
{
  "mcpServers": {
    "folio": {
      "url": "https://你的站点/api/mcp",
      "headers": {
        "Authorization": "Bearer folio_你的令牌"
      }
    }
  }
}
```

工具包括 `list_posts`、`get_post`、`publish_post`、`update_post`、`delete_post`、`upload_image` 等。说明页：`/mcp`。

## Markdown 方言

````md
```ts:src/lib/parse.ts {3-5}
export function parse(raw: string) {
  return raw.trim();
}
```
````

双链：`[[slug]]`、`[[标题]]`、`[[slug#小节]]`、`[[slug#^block|显示名]]`。

YAML 头（Obsidian / MCP 推送）：

```yaml
---
title: 判别联合笔记
slug: ts-unions
topic: TypeScript
tags:
  - TypeScript
status: published
access: public
---
```

`access`：`public` | `early` | `paid`。抢先稿用 `exclusiveDays`。

## 项目结构

```
src/routes/          文件路由
src/components/      站点壳与业务组件
src/lib/blog/        文章、Markdown、双链
src/lib/membership/  会员与正文闸门
src/lib/mcp/         Agent MCP
src/lib/obsidian/    笔记同步
migrations/          Postgres schema
Dockerfile           多阶段构建
docker-compose.yml   Postgres + 应用
scripts/update-from-release.sh
```

贡献者约定见 [`AGENTS.project.md`](./AGENTS.project.md)。Issue 与 Pull Request 都欢迎。

## 许可

[MIT](./LICENSE)
