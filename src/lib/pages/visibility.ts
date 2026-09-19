export const FRONT_PAGES = ["moments", "photos", "archive", "links"] as const;
export type FrontPage = (typeof FRONT_PAGES)[number];

export type FrontPageFlags = Record<FrontPage, boolean>;

export const FRONT_PAGE_META: Record<FrontPage, { path: `/${FrontPage}`; label: string }> = {
  moments: { path: "/moments", label: "瞬间" },
  photos: { path: "/photos", label: "图库" },
  archive: { path: "/archive", label: "归档" },
  links: { path: "/links", label: "友链" },
};

export const DEFAULT_FRONT_PAGES: FrontPageFlags = {
  moments: true,
  photos: true,
  archive: true,
  links: true,
};

export function isFrontPage(value: string): value is FrontPage {
  return (FRONT_PAGES as readonly string[]).includes(value);
}

export function parseFrontPages(raw: string | null | undefined): FrontPageFlags {
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const source = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const next = { ...DEFAULT_FRONT_PAGES };
  for (const key of FRONT_PAGES) {
    if (typeof source[key] === "boolean") next[key] = source[key];
  }
  return next;
}
