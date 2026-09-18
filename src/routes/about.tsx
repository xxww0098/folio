import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { getSiteChrome } from "@/lib/blog/server";

export const Route = createFileRoute("/about")({
  loader: () => getSiteChrome(),
  component: AboutPage,
});

function AboutPage() {
  const chrome = Route.useLoaderData();

  return (
    <SiteShell posts={chrome.posts} tags={chrome.tags} recentComments={chrome.recentComments} sidebar>
      <article className="overflow-hidden rounded-xl bg-card p-6 shadow-md sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">关于折页</h1>
        <div className="mt-6 space-y-4 text-base leading-relaxed text-foreground/90">
          <p>
            折页是一份写给工程师的独立博客。栏目按语言和主题分：TypeScript、Rust、Go、Python、SQL、Zig
            与架构。文章尽量带可运行的代码，而不是口号。
          </p>
          <p>
            代码块会标明语言、文件名和行号，支持复制和高亮行。登录之后可以投稿、管理草稿，并在文末留下评论。也可以用
            Obsidian 把笔记同步过来，或让写作 Agent 通过个人令牌远程列稿、改稿、推送。
          </p>
          <p>
            站点内置六套主题：地球、极夜、墨迹、终端、稿纸、雾面。顶栏调色盘或主题页即可切换，浅色、深色、跟随系统都能记住。
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/write"
            className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm text-primary-foreground"
          >
            去投稿
          </Link>
          <Link
            to="/themes"
            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm"
          >
            更换主题
          </Link>
          <Link
            to="/obsidian"
            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm"
          >
            Obsidian 同步
          </Link>
          <Link
            to="/mcp"
            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm"
          >
            Agent 接入
          </Link>
          <a
            href="https://github.com/xxww0098/folio"
            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <Link
            to="/archive"
            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm"
          >
            浏览归档
          </Link>
        </div>
      </article>
    </SiteShell>
  );
}
