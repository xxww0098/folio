import type { FrontPage, FrontPageFlags } from "@/lib/pages/visibility";

export const SITE_NAV = [
  { to: "/", label: "首页" },
  { to: "/moments", label: "瞬间", page: "moments" },
  { to: "/photos", label: "图库", page: "photos" },
  { to: "/archive", label: "归档", page: "archive" },
  { to: "/links", label: "友链", page: "links" },
  { to: "/about", label: "关于" },
] as const;

export type SiteNavTo = (typeof SITE_NAV)[number]["to"];

export function visibleSiteNav(pages: FrontPageFlags) {
  return SITE_NAV.filter((item) => !("page" in item) || pages[item.page as FrontPage]);
}

export function siteNavActive(pathname: string, to: SiteNavTo) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}
