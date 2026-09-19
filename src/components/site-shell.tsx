import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteRail } from "@/components/site-rail";
import { SiteSidebar } from "@/components/site-sidebar";
import type { PostListItem, RecentComment, SiteChrome, TagRef } from "@/lib/blog/types";
import { DEFAULT_FRONT_PAGES, type FrontPageFlags } from "@/lib/pages/visibility";

export function siteChromeProps(chrome: SiteChrome) {
  return {
    posts: chrome.posts,
    tags: chrome.tags,
    recentComments: chrome.recentComments,
    pages: chrome.pages,
    topics: chrome.topics,
  };
}

export function SiteShell({
  children,
  posts = [],
  tags,
  recentComments,
  pages = DEFAULT_FRONT_PAGES,
  topics = [],
  sidebar = false,
  sidebarExtra,
}: {
  children: ReactNode;
  posts?: PostListItem[];
  tags?: Array<TagRef & { count?: number }>;
  recentComments?: RecentComment[];
  pages?: FrontPageFlags;
  topics?: string[];
  sidebar?: boolean;
  sidebarExtra?: ReactNode;
}) {
  const rail = <SiteRail pages={pages} topics={topics} />;

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-background text-foreground">
      <SiteHeader posts={posts} pages={pages} topics={topics} />
      {sidebar ? (
        <div className="mx-auto mt-4 grid w-full max-w-5xl flex-1 grid-cols-1 gap-5 px-4 sm:mt-6 sm:gap-6 md:grid-cols-[minmax(0,1fr)_16rem] lg:max-w-7xl lg:grid-cols-[13rem_minmax(0,1fr)_16rem] lg:px-6">
          {rail}
          <main className="folio-page min-w-0 overflow-hidden">{children}</main>
          <div className="hidden min-w-0 w-full max-w-64 flex-col gap-6 overflow-hidden md:flex md:sticky md:top-20 md:max-h-[calc(100dvh-6rem)] md:self-start md:overflow-y-auto">
            {sidebarExtra}
            <SiteSidebar posts={posts} tags={tags} recentComments={recentComments} topics={topics} nested />
          </div>
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 lg:max-w-7xl lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6 lg:px-6">
          {rail}
          <main className="folio-page min-w-0">{children}</main>
        </div>
      )}
      <div className={sidebar ? "mt-auto" : ""}>
        <SiteFooter />
      </div>
    </div>
  );
}
