import { isTopic, type Topic } from "@/lib/blog/types";
import { clampExclusiveDays, isAccessMode, type AccessMode } from "@/lib/membership/access";

export type FolioMatter = {
  title?: string;
  slug?: string;
  excerpt?: string;
  cover?: string;
  topic?: string;
  categories?: string[];
  tags?: string[];
  status?: "draft" | "published";
  access?: AccessMode;
  exclusiveDays?: number;
  folio?: {
    site?: string;
    name?: string;
    publish?: boolean;
  };
};

export function splitFrontMatter(source: string): { matter: FolioMatter; body: string } {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n") && text !== "---") {
    if (text.startsWith("---\r")) return splitFrontMatter(text);
    return { matter: {}, body: text.trim() };
  }
  const end = text.indexOf("\n---", 4);
  if (end < 0) return { matter: {}, body: text.trim() };
  const raw = text.slice(4, end);
  let body = text.slice(end + 4);
  if (body.startsWith("\n")) body = body.slice(1);
  return { matter: parseSimpleYaml(raw), body: body.trim() };
}

export function serializeNote(matter: FolioMatter, body: string): string {
  const lines: string[] = ["---"];
  const write = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      if (!value.length) return;
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${yamlScalar(String(item))}`);
      return;
    }
    if (typeof value === "boolean") {
      lines.push(`${key}: ${value ? "true" : "false"}`);
      return;
    }
    lines.push(`${key}: ${yamlScalar(String(value))}`);
  };
  write("title", matter.title);
  write("slug", matter.slug);
  write("excerpt", matter.excerpt);
  write("cover", matter.cover);
  write("topic", matter.topic);
  write("categories", matter.categories);
  write("tags", matter.tags);
  write("status", matter.status);
  write("access", matter.access);
  write("exclusiveDays", matter.exclusiveDays);
  if (matter.folio && (matter.folio.site || matter.folio.name || matter.folio.publish !== undefined)) {
    lines.push("folio:");
    if (matter.folio.site) lines.push(`  site: ${yamlScalar(matter.folio.site)}`);
    if (matter.folio.name) lines.push(`  name: ${yamlScalar(matter.folio.name)}`);
    if (matter.folio.publish !== undefined) lines.push(`  publish: ${matter.folio.publish ? "true" : "false"}`);
  }
  lines.push("---", "", body.replace(/^\n+/, "").replace(/\n+$/, ""), "");
  return lines.join("\n");
}

export function topicFromMatter(matter: FolioMatter, fallback: Topic): Topic {
  const candidate = matter.topic || matter.categories?.[0];
  if (candidate && isTopic(candidate)) return candidate;
  return fallback;
}

export function excerptFrom(matter: FolioMatter, body: string): string {
  const raw = (matter.excerpt ?? "").trim();
  if (raw) return raw.slice(0, 180);
  const plain = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*`[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (plain.slice(0, 160) || "远程同步的笔记。").slice(0, 180);
}

export function absolutizeMarkdown(text: string, origin: string) {
  if (!origin) return text;
  return text.replace(/(!\[[^\]]*\]\()(\/[^)]+)(\))/g, `$1${origin}$2$3`);
}

function yamlScalar(value: string) {
  if (/^[\w./:@#+\u4e00-\u9fff-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function parseSimpleYaml(raw: string): FolioMatter {
  const matter: FolioMatter = {};
  const lines = raw.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim() || line.trimStart().startsWith("#")) {
      i += 1;
      continue;
    }
    const nested = /^(folio|halo):\s*$/.exec(line);
    if (nested) {
      const folio: NonNullable<FolioMatter["folio"]> = { ...matter.folio };
      i += 1;
      while (i < lines.length && /^\s{2}\S/.test(lines[i] ?? "")) {
        const pair = /^\s{2}([\w-]+):\s*(.*)$/.exec(lines[i] ?? "");
        i += 1;
        if (!pair) continue;
        const key = pair[1];
        const value = unquote(pair[2] ?? "");
        if (key === "site") folio.site = value;
        else if (key === "name") folio.name = value;
        else if (key === "publish") folio.publish = value === "true";
      }
      if (nested[1] === "folio" || !matter.folio) matter.folio = folio;
      continue;
    }
    const listKey = /^(tags|categories):\s*$/.exec(line);
    if (listKey) {
      const items: string[] = [];
      i += 1;
      while (i < lines.length && /^\s*-\s+/.test(lines[i] ?? "")) {
        items.push(unquote((lines[i] ?? "").replace(/^\s*-\s+/, "")));
        i += 1;
      }
      if (listKey[1] === "tags") matter.tags = items;
      else matter.categories = items;
      continue;
    }
    const inlineList = /^(tags|categories):\s*\[(.*)\]\s*$/.exec(line);
    if (inlineList) {
      const items = inlineList[2]
        .split(",")
        .map((part) => unquote(part.trim()))
        .filter(Boolean);
      if (inlineList[1] === "tags") matter.tags = items;
      else matter.categories = items;
      i += 1;
      continue;
    }
    const pair = /^([\w-]+):\s*(.*)$/.exec(line);
    i += 1;
    if (!pair) continue;
    const key = pair[1];
    const value = unquote(pair[2] ?? "");
    if (key === "title") matter.title = value;
    else if (key === "slug") matter.slug = value;
    else if (key === "excerpt") matter.excerpt = value;
    else if (key === "cover") matter.cover = value;
    else if (key === "topic") matter.topic = value;
    else if (key === "status" && (value === "draft" || value === "published")) matter.status = value;
    else if ((key === "access" || key === "access_mode") && isAccessMode(value)) matter.access = value;
    else if (key === "exclusiveDays" || key === "exclusive_days") matter.exclusiveDays = clampExclusiveDays(Number(value));
  }
  return matter;
}

function unquote(value: string) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "true" || trimmed === "false") return trimmed;
  return trimmed;
}
