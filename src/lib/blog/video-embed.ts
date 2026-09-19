export type VideoProvider = "youtube" | "bilibili" | "vimeo" | "youku" | "ted" | "file";

export type VideoEmbedInfo = {
  provider: VideoProvider;
  src: string;
  embed: string;
  kind: "iframe" | "file";
  title: string;
};

const FILE_EXT = /\.(mp4|webm|ogg|ogv|mov)(?:[?#]|$)/i;

function asUrl(raw: string) {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function youtubeId(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? "";
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    if (url.searchParams.get("v")) return url.searchParams.get("v") ?? "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") return parts[1] ?? "";
  }
  return "";
}

function biliId(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "player.bilibili.com") {
    return url.searchParams.get("bvid") || url.searchParams.get("aid") || "";
  }
  if (!host.endsWith("bilibili.com")) return "";
  const match = /\/video\/(BV[\w]+|av\d+)/i.exec(url.pathname);
  return match?.[1] ?? "";
}

function vimeoId(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "player.vimeo.com") {
    const id = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    return /^\d+$/.test(id) ? id : "";
  }
  if (host !== "vimeo.com") return "";
  const id = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  return /^\d+$/.test(id) ? id : "";
}

function youkuId(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "player.youku.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] === "embed" ? (parts[1] ?? "") : "";
  }
  if (!host.endsWith("youku.com")) return "";
  const match = /id_([A-Za-z0-9=]+)/.exec(url.pathname);
  return match?.[1] ?? "";
}

function tedSlug(url: URL) {
  const host = url.hostname.replace(/^www\./, "");
  if (host !== "ted.com" && host !== "embed.ted.com") return "";
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "talks" || !parts[1]) return "";
  return parts[1];
}

export function parseVideoUrl(raw: string): VideoEmbedInfo | null {
  const url = asUrl(raw);
  if (!url) return null;
  const src = url.toString();

  const yt = youtubeId(url);
  if (yt && /^[\w-]{6,}$/.test(yt)) {
    return {
      provider: "youtube",
      src,
      embed: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`,
      kind: "iframe",
      title: "YouTube",
    };
  }

  const bv = biliId(url);
  if (bv) {
    const query = bv.startsWith("BV") || bv.startsWith("bv") ? `bvid=${encodeURIComponent(bv)}` : `aid=${encodeURIComponent(bv.replace(/^av/i, ""))}`;
    return {
      provider: "bilibili",
      src,
      embed: `https://player.bilibili.com/player.html?${query}&page=1&high_quality=1&danmaku=0`,
      kind: "iframe",
      title: "哔哩哔哩",
    };
  }

  const vm = vimeoId(url);
  if (vm) {
    return {
      provider: "vimeo",
      src,
      embed: `https://player.vimeo.com/video/${encodeURIComponent(vm)}`,
      kind: "iframe",
      title: "Vimeo",
    };
  }

  const yk = youkuId(url);
  if (yk) {
    return {
      provider: "youku",
      src,
      embed: `https://player.youku.com/embed/${encodeURIComponent(yk)}`,
      kind: "iframe",
      title: "优酷",
    };
  }

  const ted = tedSlug(url);
  if (ted) {
    return {
      provider: "ted",
      src,
      embed: `https://embed.ted.com/talks/${encodeURIComponent(ted)}`,
      kind: "iframe",
      title: "TED",
    };
  }

  if (FILE_EXT.test(url.pathname)) {
    return { provider: "file", src, embed: src, kind: "file", title: "视频" };
  }

  return null;
}

/** A paragraph that is only a video URL, or `![alt](video-url)` / `[alt](video-url)`. */
export function videoFromBlock(block: string): VideoEmbedInfo | null {
  const text = block.trim();
  const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(text);
  if (image) return parseVideoUrl(image[2]);
  const link = /^\[([^\]]*)\]\(([^)]+)\)$/.exec(text);
  if (link) return parseVideoUrl(link[2]);
  const naked = text.replace(/^<|>$/g, "");
  return parseVideoUrl(naked);
}
