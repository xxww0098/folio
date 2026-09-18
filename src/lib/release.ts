export const GITHUB_OWNER = "xxww0098";
export const GITHUB_REPO = "folio";
export const GITHUB_REPO_SLUG = `${GITHUB_OWNER}/${GITHUB_REPO}`;
export const GITHUB_URL = `https://github.com/${GITHUB_REPO_SLUG}`;
export const GITHUB_RELEASES_URL = `${GITHUB_URL}/releases`;
export const GHCR_IMAGE = `ghcr.io/${GITHUB_REPO_SLUG}`;

export const CURRENT_VERSION =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_FOLIO_VERSION) || "0.1.3";

export type GithubRelease = {
  tag: string;
  name: string;
  url: string;
  publishedAt: string | null;
};

export function parseVersion(value: string) {
  return value.trim().replace(/^v/i, "");
}

export function isNewerRelease(current: string, latest: string) {
  const a = parseVersion(current).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const b = parseVersion(latest).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (right > left) return true;
    if (right < left) return false;
  }
  return false;
}

export async function fetchLatestRelease(signal?: AbortSignal): Promise<GithubRelease | null> {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO_SLUG}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("无法读取 GitHub Release");
  const data = (await response.json()) as {
    tag_name?: string;
    name?: string;
    html_url?: string;
    published_at?: string;
  };
  const tag = data.tag_name?.trim();
  if (!tag) return null;
  return {
    tag,
    name: data.name?.trim() || tag,
    url: data.html_url || GITHUB_RELEASES_URL,
    publishedAt: data.published_at ?? null,
  };
}
