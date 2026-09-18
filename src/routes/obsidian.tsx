import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { getSiteChrome } from "@/lib/blog/server";
import { downloadFolioPlugin } from "@/lib/obsidian/plugin-download";

export const Route = createFileRoute("/obsidian")({
  loader: () => getSiteChrome(),
  head: () => ({ meta: [{ title: "Obsidian - 折页" }] }),
  component: ObsidianGuidePage,
});

function ObsidianGuidePage() {
  const chrome = Route.useLoaderData();
  const [busy, setBusy] = useState(false);

  async function onDownload() {
    setBusy(true);
    try {
      await downloadFolioPlugin();
      toast.success("已开始下载插件包");
    } catch {
      toast.error("无法打包插件");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteShell posts={chrome.posts} tags={chrome.tags} recentComments={chrome.recentComments} sidebar>
      <article className="overflow-hidden rounded-xl bg-card p-6 shadow-md sm:p-8">
        <p className="font-mono text-xs text-muted-foreground">Obsidian</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">把笔记同步到折页</h1>
        <p className="mt-4 text-base leading-relaxed text-foreground/90">
          配置站点与个人令牌，打开一篇笔记，用命令面板发布、上传图片，或把站点上的文章拉回库里。
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => void onDownload()} disabled={busy}>
            {busy ? "打包中…" : "下载插件包"}
          </Button>
          <Button asChild variant="outline">
            <Link to="/console">去控制台签发令牌</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/mcp">Agent 远程接入</Link>
          </Button>
        </div>

        <ol className="mt-8 space-y-5 text-base leading-relaxed">
          <li>
            <h2 className="text-base font-semibold">1. 安装插件</h2>
            <p className="mt-1 text-foreground/90">
              下载 zip，解压得到 <span className="font-mono text-sm">folio/</span> 文件夹，放到你的库
              <span className="font-mono text-sm"> .obsidian/plugins/folio/</span>
              。在 Obsidian 第三方插件里启用「折页」。
            </p>
          </li>
          <li>
            <h2 className="text-base font-semibold">2. 签发令牌</h2>
            <p className="mt-1 text-foreground/90">
              登录折页，打开控制台的 Obsidian 或 Agent 页，签发个人令牌。完整字符串只出现一次，以
              <span className="font-mono text-sm"> folio_</span> 开头。同一令牌也可给写作 Agent 远程推稿。
            </p>
          </li>
          <li>
            <h2 className="text-base font-semibold">3. 填写站点</h2>
            <p className="mt-1 text-foreground/90">
              在插件设置里添加站点：名称随意，地址填当前折页网址，令牌粘贴刚才复制的值。可设为默认站点。
            </p>
          </li>
          <li>
            <h2 className="text-base font-semibold">4. 发布笔记</h2>
            <p className="mt-1 text-foreground/90">命令面板输入「折页」，可用这些命令：</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>发布到折页</li>
              <li>发布到折页（使用默认站点）</li>
              <li>上传图片到折页</li>
              <li>从折页拉取文章</li>
              <li>从折页更新内容</li>
            </ul>
          </li>
        </ol>

        <h2 className="mt-8 text-base font-semibold">正文双链</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          折页会把 <span className="font-mono text-xs">[[别名]]</span>、<span className="font-mono text-xs">[[别名#小节]]</span>、
          <span className="font-mono text-xs">[[别名#^块|显示名]]</span> 解析成站内文章。从库里同步过来的笔记若用同样写法，发布后即可互跳；阅读页右侧给出链和反向链接。
        </p>

        <h2 className="mt-8 text-base font-semibold">笔记头信息</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          发布成功后会写回 <span className="font-mono text-xs">folio.site / name / publish</span>
          。再次发布同一别名会覆盖原文并留下版本。
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-code p-4 font-mono text-xs leading-relaxed text-code-fg">
          {FRONT_MATTER}
        </pre>
      </article>
    </SiteShell>
  );
}

const FRONT_MATTER = `---
title: 判别联合笔记
slug: ts-unions-from-obsidian
topic: TypeScript
tags:
  - TypeScript
  - 类型系统
folio:
  publish: true
---

正文从这里开始。本地图片会在发布时上传。`;
