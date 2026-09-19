import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createObsidianToken,
  listObsidianPosts,
  listObsidianTokens,
  publishObsidianMarkdown,
  pullObsidianPost,
  revokeObsidianToken,
  type TokenRow,
} from "@/lib/obsidian/server";
import { downloadFolioPlugin } from "@/lib/obsidian/plugin-download";
import { formatZhDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function randomTokenName() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `obsidian-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

type SyncPost = {
  id: number;
  slug: string;
  title: string;
  topic: string;
  status: string;
  updatedAt: string;
};

export function ObsidianPanel() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [posts, setPosts] = useState<SyncPost[]>([]);
  const [tokenName, setTokenName] = useState("Obsidian");
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [markdown, setMarkdown] = useState(SAMPLE);
  const [busy, setBusy] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function refresh() {
    const [nextTokens, nextPosts] = await Promise.all([listObsidianTokens(), listObsidianPosts()]);
    setTokens(nextTokens);
    setPosts(nextPosts);
  }

  useEffect(() => {
    void refresh().catch(() => {
      setTokens([]);
      setPosts([]);
    });
  }, []);

  async function onCreateToken() {
    setBusy("token");
    try {
      const result = await createObsidianToken({ data: { name: tokenName.trim() || "Obsidian" } });
      setFreshToken(result.token);
      setTokens((current) => [result.item, ...current]);
      toast.success("令牌已签发，请立即复制");
    } catch {
      toast.error("无法签发令牌");
    } finally {
      setBusy(null);
    }
  }

  async function onRevoke(id: number) {
    setBusy(`revoke-${id}`);
    try {
      await revokeObsidianToken({ data: { id } });
      setTokens((current) => current.filter((item) => item.id !== id));
      toast.success("已撤销");
    } catch {
      toast.error("无法撤销");
    } finally {
      setBusy(null);
    }
  }

  async function onPublish(source?: string) {
    const text = (source ?? markdown).trim();
    if (text.length < 8) {
      toast.error("正文太短");
      return;
    }
    setBusy("publish");
    try {
      const result = await publishObsidianMarkdown({
        data: { markdown: text, origin: window.location.origin },
      });
      setMarkdown(result.markdown);
      setPublishedUrl(result.url);
      await refresh();
      toast.success(result.created ? "已从笔记发布" : "已更新文章");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "同步失败");
    } finally {
      setBusy(null);
    }
  }

  async function onPull(slug: string) {
    setBusy(`pull-${slug}`);
    try {
      const result = await pullObsidianPost({
        data: { slug, origin: window.location.origin },
      });
      const blob = new Blob([result.markdown], { type: "text/markdown;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${slug}.md`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      toast.success("已下载 Markdown");
    } catch {
      toast.error("无法拉取这篇文章");
    } finally {
      setBusy(null);
    }
  }

  async function onDownloadPlugin() {
    setBusy("zip");
    try {
      await downloadFolioPlugin();
      toast.success("已开始下载插件包");
    } catch {
      toast.error("无法打包插件");
    } finally {
      setBusy(null);
    }
  }

  async function onDrop(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith(".md")) {
      toast.error("请放入 Markdown 文件");
      return;
    }
    const text = await file.text();
    setMarkdown(text);
    await onPublish(text);
  }

  return (
    <div className="mt-4 space-y-8">
      <section className="rounded-xl bg-card p-5 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Obsidian 插件</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              下载插件包，解压到库的 <span className="font-mono text-xs">.obsidian/plugins/</span>{" "}
              目录，启用「折页」。命令：发布、默认发布、上传图片、拉取、更新。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onDownloadPlugin()} disabled={busy === "zip"}>
              {busy === "zip" ? "打包中…" : "下载插件"}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-card p-5 shadow-md">
        <h2 className="text-base font-semibold">个人令牌</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          在插件设置里填写站点地址和令牌。同一令牌也可给写作 Agent 用。完整令牌只显示一次。
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Label htmlFor="token-name">令牌名称</Label>
            <Input
              id="token-name"
              className="mt-2"
              value={tokenName}
              maxLength={32}
              onChange={(event) => setTokenName(event.target.value)}
            />
          </div>
          <Button type="button" variant="outline" onClick={() => setTokenName(randomTokenName())}>
            随机生成
          </Button>
          <Button type="button" onClick={() => void onCreateToken()} disabled={busy === "token"}>
            {busy === "token" ? "签发中…" : "签发令牌"}
          </Button>
        </div>
        {freshToken ? (
          <div className="mt-4 rounded-lg border border-border bg-secondary/60 p-3">
            <p className="text-xs text-muted-foreground">请立即复制，关闭后无法再看。</p>
            <code className="mt-2 block break-all font-mono text-xs">{freshToken}</code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => {
                void navigator.clipboard?.writeText(freshToken).then(
                  () => toast.success("已复制"),
                  () => toast.error("无法写入剪贴板，请手动复制"),
                );
              }}
            >
              复制令牌
            </Button>
          </div>
        ) : null}
        {tokens.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">还没有令牌。</p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {tokens.map((token) => (
              <li key={token.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{token.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {token.prefix}… · {token.lastUsedAt ? `最近 ${formatZhDate(token.lastUsedAt)}` : "尚未使用"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={busy === `revoke-${token.id}`}
                  onClick={() => void onRevoke(token.id)}
                >
                  撤销
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-card p-5 shadow-md">
        <h2 className="text-base font-semibold">粘贴或拖入笔记</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          预览里没法打开 Obsidian，可以把 `.md` 拖到这里，或直接粘贴后发布。
        </p>
        <div
          className={`mt-4 rounded-lg border border-dashed px-4 py-6 text-center text-sm ${
            dragging ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void onDrop(event.dataTransfer.files[0]);
          }}
        >
          把 Markdown 文件拖到这里
        </div>
        <Textarea
          className="mt-4 min-h-56 font-mono text-sm"
          value={markdown}
          onChange={(event) => setMarkdown(event.target.value)}
          aria-label="要同步的 Markdown"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void onPublish()} disabled={busy === "publish"}>
            {busy === "publish" ? "同步中…" : "发布到折页"}
          </Button>
          {publishedUrl ? (
            <a href={publishedUrl} className="text-sm text-primary hover:underline">
              查看文章
            </a>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl bg-card p-5 shadow-md">
        <h2 className="text-base font-semibold">从站点拉取</h2>
        <p className="mt-1 text-sm text-muted-foreground">下载带 YAML 头的 Markdown，可放回 Obsidian 库。</p>
        {posts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">还没有可同步的文章。</p>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {posts.slice(0, 12).map((post) => (
              <li key={post.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{post.title}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {post.slug} · {post.topic} · {post.status === "published" ? "已发布" : "草稿"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy === `pull-${post.slug}`}
                  onClick={() => void onPull(post.slug)}
                >
                  下载
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const SAMPLE = `---
title: 从 Obsidian 写起
topic: TypeScript
tags:
  - Obsidian
  - 同步
folio:
  publish: true
---

# 从 Obsidian 写起

折页接受笔记开头的 YAML。\`folio.name\` 是文章别名，再次发布会覆盖同一篇。

\`\`\`ts:src/hello.ts
export const hello = (name: string) => \`hi, \${name}\`;
\`\`\`
`;
