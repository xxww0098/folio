import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteSidebar } from "@/components/site-sidebar";
import type { PostListItem, RecentComment, SiteChrome, TagRef } from "@/lib/blog/types";
import { DEFAULT_FRONT_PAGES, type FrontPageFlags } from "@/lib/pages/visibility";

export function siteChromeProps(chrome: SiteChrome) {
  return {
    posts: chrome.posts,
    tags: chrome.tags,
    recentComments: chrome.recentComments,
    pages: chrome.pages,
  };
}

export function SiteShell({
  children,
  posts = [],
  tags,
  recentComments,
  pages = DEFAULT_FRONT_PAGES,
  sidebar = false,
  sidebarExtra,
}: {
  children: ReactNode;
  posts?: PostListItem[];
  tags?: Array<TagRef & { count?: number }>;
  recentComments?: RecentComment[];
  pages?: FrontPageFlags;
  sidebar?: boolean;
  sidebarExtra?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader posts={posts} pages={pages} />
      {sidebar ? (
        <div className="mx-auto mt-6 grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 md:grid-cols-[1fr_18rem] lg:px-6">
          <main className="folio-page min-w-0">{children}</main>
          <div className="hidden w-72 shrink-0 flex-col gap-6 md:flex">
            {sidebarExtra}
            <SiteSidebar posts={posts} tags={tags} recentComments={recentComments} nested />
          </div>
        </div>
      ) : (
        <main className="folio-page flex-1">{children}</main>
      )}
      <div className={sidebar ? "mt-auto" : ""}>
        <SiteFooter />
      </div>
    </div>
  );
}
