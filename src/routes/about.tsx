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
        <p className="mt-6 text-base leading-relaxed text-foreground/90">
          写给工程师的独立博客。栏目按语言分，正文带可运行的代码。站长登录后写稿、发瞬间；Obsidian
          与写作 Agent 用同一类令牌推送。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/write"
            className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm text-primary-foreground transition-transform duration-150 ease-out active:scale-[0.96]"
          >
            投稿
          </Link>
          <a
            href="https://github.com/xxww0098/folio"
            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </article>
    </SiteShell>
  );
}
