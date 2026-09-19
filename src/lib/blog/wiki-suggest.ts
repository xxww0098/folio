import { foldWikiKey, wikiShortLabel, type WikiCatalogItem } from "./wikilink.ts";

export type WikiSuggestHit = {
  slug: string;
  title: string;
  heading?: string;
  inner: string;
  label: string;
  hint: string;
};

export function findOpenWikiQuery(textBeforeCursor: string) {
  const idx = textBeforeCursor.lastIndexOf("[[");
  if (idx < 0) return null;
  const after = textBeforeCursor.slice(idx + 2);
  if (after.includes("]]") || after.includes("\n")) return null;
  return { query: after, start: idx };
}

export function parseWikiQuery(raw: string) {
  const text = raw.replace(/\]+$/, "");
  const pipe = text.indexOf("|");
  const dest = (pipe >= 0 ? text.slice(0, pipe) : text).trim();
  const hash = dest.indexOf("#");
  if (hash >= 0) {
    return { target: dest.slice(0, hash).trim(), heading: dest.slice(hash + 1).trim(), headingMode: true };
  }
  return { target: dest, heading: "", headingMode: false };
}

function scoreNote(query: string, item: WikiCatalogItem) {
  const q = query.trim().toLowerCase();
  const folded = foldWikiKey(query);
  const title = item.title.toLowerCase();
  const slug = item.slug.toLowerCase();
  const short = wikiShortLabel(item.title).toLowerCase();
  if (!q) return 1;
  if (slug === q || title === q) return 100;
  if (slug.startsWith(q) || title.startsWith(q) || short.startsWith(q)) return 80;
  if (slug.includes(q) || title.includes(q) || short.includes(q)) return 50;
  if (folded && (foldWikiKey(item.slug).includes(folded) || foldWikiKey(item.title).includes(folded))) return 30;
  return 0;
}

export function wikiTokenFor(item: WikiCatalogItem, heading?: string) {
  const label = wikiShortLabel(item.title);
  const dest = heading ? `${item.slug}#${heading}` : item.slug;
  if (label && label !== item.slug) return `${dest}|${label}`;
  return dest;
}

export function suggestWiki(query: string, catalog: WikiCatalogItem[], limit = 8): WikiSuggestHit[] {
  const { target, heading, headingMode } = parseWikiQuery(query);
  const ranked = catalog
    .map((item) => ({ item, score: scoreNote(target, item) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, "zh"));

  const hits: WikiSuggestHit[] = [];
  for (const { item } of ranked) {
    if (headingMode) {
      const heads = item.headings.filter((h) => !heading || h.text.toLowerCase().includes(heading.toLowerCase()));
      for (const h of heads.slice(0, 4)) {
        hits.push({
          slug: item.slug,
          title: item.title,
          heading: h.text,
          inner: wikiTokenFor(item, h.text),
          label: `${wikiShortLabel(item.title)} › ${h.text}`,
          hint: item.slug,
        });
        if (hits.length >= limit) return hits;
      }
      continue;
    }
    hits.push({
      slug: item.slug,
      title: item.title,
      inner: wikiTokenFor(item),
      label: wikiShortLabel(item.title),
      hint: item.slug,
    });
    if (hits.length >= limit) return hits;
  }
  return hits;
}
