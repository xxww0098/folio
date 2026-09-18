export type WikiLink = {
  raw: string;
  target: string;
  heading?: string;
  block?: string;
  alias?: string;
};

export type WikiCatalogItem = {
  slug: string;
  title: string;
  headings: Array<{ id: string; text: string }>;
};

export type WikiMention = {
  slug: string;
  title: string;
  heading?: string;
  headingId?: string;
  alias?: string;
  snippet: string;
};

export type WikiGraph = {
  catalog: WikiCatalogItem[];
  outgoing: WikiMention[];
  backlinks: WikiMention[];
  unlinked: WikiMention[];
  suggested: WikiMention[];
  unresolved: string[];
};

export const EMPTY_WIKI: WikiGraph = {
  catalog: [],
  outgoing: [],
  backlinks: [],
  unlinked: [],
  suggested: [],
  unresolved: [],
};

const FENCE = /```[\s\S]*?```/g;
const WIKI_TOKEN = /\[\[([^\[\]]+)\]\]/g;

export function splitMarkdownBlocks(source: string): string[] {
  const text = source.replace(/\r\n/g, "\n").trim();
  const parts: string[] = [];
  const fence = /```[\s\S]*?```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(text))) {
    const before = text.slice(last, match.index).trim();
    if (before) parts.push(...before.split(/\n{2,}/));
    parts.push(match[0]);
    last = match.index + match[0].length;
  }
  const rest = text.slice(last).trim();
  if (rest) parts.push(...rest.split(/\n{2,}/));
  return parts.map((part) => part.trim()).filter(Boolean);
}

export function stripWikiMarkup(source: string) {
  return source.replace(
    /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g,
    (_m, target: string, alias?: string) => alias || target,
  );
}

function plainHeading(text: string) {
  return stripWikiMarkup(text)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

export function extractHeadings(source: string): Array<{ id: string; text: string; level: 2 | 3 }> {
  const items: Array<{ id: string; text: string; level: 2 | 3 }> = [];
  let heading = 0;
  for (const block of splitMarkdownBlocks(source)) {
    if (block.startsWith("### ")) {
      items.push({ id: `s-${heading}`, text: plainHeading(block.slice(4).trim()), level: 3 });
      heading += 1;
    } else if (block.startsWith("## ")) {
      items.push({ id: `s-${heading}`, text: plainHeading(block.slice(3).trim()), level: 2 });
      heading += 1;
    }
  }
  return items;
}

export function parseWikiInner(inner: string): Omit<WikiLink, "raw"> {
  const pipe = inner.indexOf("|");
  const alias = pipe >= 0 ? inner.slice(pipe + 1).trim() || undefined : undefined;
  let dest = (pipe >= 0 ? inner.slice(0, pipe) : inner).trim();
  dest = dest.replace(/\.md(?=#|$)/i, "");
  const hash = dest.indexOf("#");
  let target = dest;
  let heading: string | undefined;
  let block: string | undefined;
  if (hash >= 0) {
    target = dest.slice(0, hash).trim();
    const frag = dest.slice(hash + 1).trim();
    if (frag.startsWith("^")) block = frag.slice(1) || undefined;
    else heading = frag || undefined;
  }
  return { target, heading, block, alias };
}

export function parseWikiLink(raw: string): WikiLink | null {
  const match = /^\[\[([^\[\]]+)\]\]$/.exec(raw.trim());
  if (!match) return null;
  return { raw: match[0], ...parseWikiInner(match[1] ?? "") };
}

export function wikiDisplay(link: Pick<WikiLink, "target" | "heading" | "block" | "alias">) {
  if (link.alias) return link.alias;
  if (link.target) return link.target;
  if (link.heading) return link.heading;
  if (link.block) return `^${link.block}`;
  return "";
}

export function wikiShortLabel(title: string) {
  const cut = title.split(/[：:]/)[0]?.trim() || title.trim();
  return cut || title;
}

function scanChunk(chunk: string, links: WikiLink[]) {
  const pattern = /(`[^`]+`)|(\[\[[^\[\]]+\]\])/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(chunk))) {
    if (!match[2]) continue;
    const parsed = parseWikiLink(match[2]);
    if (parsed) links.push(parsed);
  }
}

export function extractWikiLinks(source: string): WikiLink[] {
  const links: WikiLink[] = [];
  const text = source.replace(/\r\n/g, "\n");
  let last = 0;
  let match: RegExpExecArray | null;
  FENCE.lastIndex = 0;
  while ((match = FENCE.exec(text))) {
    scanChunk(text.slice(last, match.index), links);
    last = match.index + match[0].length;
  }
  scanChunk(text.slice(last), links);
  return links;
}

export function foldWikiKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isUsableAlias(value: string) {
  const text = value.trim();
  if (text.length < 2) return false;
  const cjk = Array.from(text).filter((ch) => /[\u4e00-\u9fff]/.test(ch)).length;
  if (cjk >= 2) return true;
  return text.length >= 8;
}

function keysFor(note: { slug: string; title: string }) {
  const keys = [foldWikiKey(note.slug), foldWikiKey(note.title)];
  const short = wikiShortLabel(note.title);
  if (short !== note.title && isUsableAlias(short)) keys.push(foldWikiKey(short));
  return keys.filter(Boolean);
}

export function resolveWikiTarget<T extends { slug: string; title: string }>(
  target: string,
  catalog: T[],
): T | null {
  const raw = target.trim();
  if (!raw) return null;
  const folded = foldWikiKey(raw);
  const exactSlug = catalog.find((note) => note.slug.toLowerCase() === raw.toLowerCase());
  if (exactSlug) return exactSlug;
  const exactTitle = catalog.find((note) => note.title === raw || note.title.toLowerCase() === raw.toLowerCase());
  if (exactTitle) return exactTitle;
  if (!folded) return null;
  return catalog.find((note) => keysFor(note).includes(folded)) ?? null;
}

function foldHeading(value: string) {
  return value.replace(/[`*_]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function resolveHeadingId(
  heading: string | undefined,
  headings: Array<{ id: string; text: string }>,
) {
  if (!heading) return undefined;
  const folded = foldHeading(heading);
  return headings.find((item) => foldHeading(item.text) === folded)?.id;
}

export function snippetAround(source: string, raw: string, max = 72) {
  const parsed = raw.startsWith("[[") ? parseWikiLink(raw) : null;
  const needle = parsed ? wikiDisplay(parsed) || parsed.target || raw : raw;
  const plain = stripWikiMarkup(source.replace(/```[\s\S]*?```/g, " "))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ");
  const idx = plain.indexOf(needle);
  const start = idx >= 0 ? Math.max(0, idx - 16) : 0;
  const end = idx >= 0 ? Math.min(plain.length, idx + needle.length + 36) : max;
  let cleaned = plain.slice(start, end).trim();
  if (start > 0) cleaned = `…${cleaned}`;
  if (end < plain.length) cleaned = `${cleaned}…`;
  if (cleaned.length <= max + 2) return cleaned;
  return `${cleaned.slice(0, max)}…`;
}

export function toMention(
  link: WikiLink,
  note: WikiCatalogItem,
  sourceBody: string,
): WikiMention {
  return {
    slug: note.slug,
    title: note.title,
    heading: link.heading,
    headingId: resolveHeadingId(link.heading, note.headings),
    alias: link.alias,
    snippet: snippetAround(sourceBody, link.raw),
  };
}

function maskNonProse(source: string) {
  return source
    .replace(/```[\s\S]*?```/g, (block) => " ".repeat(block.length))
    .replace(/`[^`]+`/g, (block) => " ".repeat(block.length))
    .replace(WIKI_TOKEN, (block) => " ".repeat(block.length));
}

export function findUnlinkedMentions(
  source: string,
  catalog: WikiCatalogItem[],
  currentSlug: string,
): WikiMention[] {
  const masked = maskNonProse(source);
  const hits: WikiMention[] = [];
  const seen = new Set<string>();
  const notes = [...catalog]
    .filter((note) => note.slug !== currentSlug)
    .sort((left, right) => right.title.length - left.title.length);

  for (const note of notes) {
    const needles = [note.title, note.slug].filter((needle) => needle.length >= 4);
    for (const needle of needles) {
      const idx = masked.indexOf(needle);
      if (idx < 0) continue;
      if (seen.has(note.slug)) break;
      seen.add(note.slug);
      hits.push({
        slug: note.slug,
        title: note.title,
        snippet: snippetAround(source, needle),
      });
      break;
    }
  }
  return hits;
}

export function buildWikiGraph(
  currentSlug: string,
  currentBody: string,
  notes: WikiCatalogItem[],
  bodies: Record<string, string>,
): WikiGraph {
  const catalog = notes;
  const outgoing: WikiMention[] = [];
  const unresolved: string[] = [];
  const seenOut = new Set<string>();

  for (const link of extractWikiLinks(currentBody)) {
    if (!link.target) continue;
    const note = resolveWikiTarget(link.target, catalog);
    if (!note) {
      if (!unresolved.includes(link.target)) unresolved.push(link.target);
      continue;
    }
    if (note.slug === currentSlug) continue;
    const key = `${note.slug}#${link.heading ?? ""}${link.block ? `^${link.block}` : ""}`;
    if (seenOut.has(key)) continue;
    seenOut.add(key);
    outgoing.push(toMention(link, note, currentBody));
  }

  const backlinks: WikiMention[] = [];
  const seenBack = new Set<string>();
  const self = catalog.find((note) => note.slug === currentSlug);

  for (const note of catalog) {
    if (note.slug === currentSlug) continue;
    const body = bodies[note.slug] ?? "";
    for (const link of extractWikiLinks(body)) {
      if (!link.target) continue;
      const resolved = resolveWikiTarget(link.target, catalog);
      const hitsSelf =
        resolved?.slug === currentSlug ||
        (self && keysFor(self).includes(foldWikiKey(link.target)));
      if (!hitsSelf) continue;
      if (seenBack.has(note.slug)) continue;
      seenBack.add(note.slug);
      backlinks.push({
        slug: note.slug,
        title: note.title,
        heading: link.heading,
        headingId: resolveHeadingId(link.heading, self?.headings ?? []),
        alias: link.alias,
        snippet: snippetAround(body, link.raw),
      });
    }
  }

  const unlinked: WikiMention[] = [];
  if (self) {
    for (const note of catalog) {
      if (note.slug === currentSlug || seenBack.has(note.slug)) continue;
      const body = bodies[note.slug] ?? "";
      const hits = findUnlinkedMentions(body, [self], note.slug);
      if (!hits.length) continue;
      unlinked.push({
        slug: note.slug,
        title: note.title,
        snippet: hits[0]?.snippet ?? "",
      });
    }
  }

  const suggested = findUnlinkedMentions(currentBody, catalog, currentSlug).filter(
    (item) => !outgoing.some((link) => link.slug === item.slug),
  );

  return { catalog, outgoing, backlinks, unlinked, suggested, unresolved };
}
