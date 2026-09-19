import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CodeBlock } from "@/components/code-block";
import { parseFence } from "./highlight";
import {
  extractHeadings,
  parseWikiInner,
  resolveHeadingId,
  resolveWikiTarget,
  splitMarkdownBlocks,
  wikiDisplay,
  type WikiCatalogItem,
} from "./wikilink";
import { cn } from "@/lib/utils";

export type TocItem = { id: string; text: string; level: 2 | 3 };

function headingId(index: number) {
  return `s-${index}`;
}

function safeHref(href: string) {
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

function splitBlockId(text: string) {
  const match = /(?:^|\s)\^([A-Za-z0-9_-]+)\s*$/.exec(text);
  if (!match) return { text, blockId: undefined as string | undefined };
  return { text: text.slice(0, match.index).trimEnd(), blockId: match[1] };
}

function wikiNode(rawInner: string, key: string, catalog: WikiCatalogItem[], localHeadings: WikiCatalogItem["headings"]) {
  const link = parseWikiInner(rawInner);
  const note = link.target ? resolveWikiTarget(link.target, catalog) : undefined;
  const label = wikiDisplay(link) || rawInner;
  const headingIdValue = resolveHeadingId(link.heading, note?.headings ?? localHeadings);
  const hash = headingIdValue ? `#${headingIdValue}` : link.block ? `#b-${link.block}` : "";

  if (!link.target && hash) {
    return (
      <a key={key} href={hash} className="wiki-link font-medium text-primary underline-offset-4 hover:underline">
        {label}
      </a>
    );
  }

  if (note) {
    return (
      <Link
        key={key}
        to="/posts/$slug"
        params={{ slug: note.slug }}
        hash={hash.slice(1) || undefined}
        className="wiki-link font-medium text-primary underline-offset-4 decoration-primary/40 hover:underline"
      >
        {label}
      </Link>
    );
  }

  return (
    <span key={key} className="wiki-missing text-muted-foreground" title="尚未对应到文章">
      {label}
    </span>
  );
}

function inline(text: string, keyPrefix: string, catalog: WikiCatalogItem[], localHeadings: WikiCatalogItem["headings"]): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\[\[[^\[\]]+\]\]|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${i}`}
          className="rounded-sm bg-secondary px-1 py-0.5 font-mono text-[0.9em] text-primary"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[[")) {
      nodes.push(wikiNode(token.slice(2, -2), `${keyPrefix}-w-${i}`, catalog, localHeadings));
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-medium text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={`${keyPrefix}-i-${i}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      const md = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const href = md ? safeHref(md[2]) : null;
      if (md && href) {
        nodes.push(
          <a
            key={`${keyPrefix}-a-${i}`}
            href={href}
            className="text-primary underline-offset-4 hover:underline"
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            target={href.startsWith("http") ? "_blank" : undefined}
          >
            {md[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    }
    last = match.index + token.length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function extractToc(source: string): TocItem[] {
  return extractHeadings(source);
}

export function ArticleBody({ source, catalog = [] }: { source: string; catalog?: WikiCatalogItem[] }) {
  const blocks = splitMarkdownBlocks(source);
  const localHeadings = extractToc(source).map((item) => ({ id: item.id, text: item.text }));
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let listKind: "ul" | "ol" = "ul";
  let heading = 0;

  const flushList = (key: string) => {
    if (!listItems.length) return;
    const Tag = listKind;
    elements.push(
      <Tag
        key={key}
        className={
          Tag === "ol"
            ? "my-5 list-decimal space-y-2 pl-6 text-base leading-relaxed text-foreground/90"
            : "my-5 list-disc space-y-2 pl-6 text-base leading-relaxed text-foreground/90"
        }
      >
        {listItems.map((item, idx) => {
          const split = splitBlockId(item);
          return (
            <li key={`${key}-${idx}`} id={split.blockId ? `b-${split.blockId}` : undefined} className={cn(split.blockId && "scroll-mt-24")}>
              {inline(split.text, `${key}-${idx}`, catalog, localHeadings)}
            </li>
          );
        })}
      </Tag>,
    );
    listItems = [];
    listKind = "ul";
  };

  blocks.forEach((raw, index) => {
    const block = raw.trim();
    if (!block) return;

    if (block.startsWith("```")) {
      flushList(`ul-pre-${index}`);
      const fence = parseFence(block);
      elements.push(
        <CodeBlock
          key={`pre-${index}`}
          lang={fence.lang}
          filename={fence.filename}
          highlights={fence.highlights}
          code={fence.code}
        />,
      );
      return;
    }

    if (block.startsWith("- ")) {
      if (listKind !== "ul" && listItems.length) flushList(`ol-pre-${index}`);
      listKind = "ul";
      listItems.push(
        ...block
          .split("\n")
          .map((line) => line.replace(/^- /, "").trim())
          .filter(Boolean),
      );
      flushList(`ul-${index}`);
      return;
    }

    if (/^\d+\. /.test(block)) {
      if (listKind !== "ol" && listItems.length) flushList(`ul-pre-${index}`);
      listKind = "ol";
      listItems.push(
        ...block
          .split("\n")
          .map((line) => line.replace(/^\d+\. /, "").trim())
          .filter(Boolean),
      );
      flushList(`ol-${index}`);
      return;
    }

    flushList(`ul-pre-${index}`);

    if (block === "---") {
      elements.push(<hr key={`hr-${index}`} className="my-10 border-border" />);
      return;
    }

    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(block);
    if (image) {
      const src = safeHref(image[2]);
      if (src) {
        elements.push(
          <img key={`img-${index}`} src={src} alt={image[1]} className="folio-photo my-6 w-full rounded-lg" />,
        );
        return;
      }
    }

    if (block.startsWith("> ")) {
      const quote = block
        .split("\n")
        .map((line) => line.replace(/^>\s?/, ""))
        .join(" ");
      const split = splitBlockId(quote);
      elements.push(
        <blockquote
          key={`q-${index}`}
          id={split.blockId ? `b-${split.blockId}` : undefined}
          className="my-6 scroll-mt-24 border-l-2 border-primary pl-4 text-base leading-relaxed text-foreground/80 italic"
        >
          {inline(split.text, `q-${index}`, catalog, localHeadings)}
        </blockquote>,
      );
      return;
    }

    if (block.startsWith("### ")) {
      const id = headingId(heading);
      heading += 1;
      elements.push(
        <h3 id={id} key={`h3-${index}`} className="mt-8 mb-3 scroll-mt-24 font-display text-lg font-semibold tracking-tight">
          {inline(block.slice(4), `h3-${index}`, catalog, localHeadings)}
        </h3>,
      );
      return;
    }

    if (block.startsWith("## ")) {
      const id = headingId(heading);
      heading += 1;
      elements.push(
        <h2 id={id} key={`h2-${index}`} className="mt-10 mb-3 scroll-mt-24 font-display text-xl font-semibold tracking-tight">
          {inline(block.slice(3), `h2-${index}`, catalog, localHeadings)}
        </h2>,
      );
      return;
    }

    if (block.startsWith("# ")) {
      const id = headingId(heading);
      heading += 1;
      elements.push(
        <h1 id={id} key={`h1-${index}`} className="mt-10 mb-4 scroll-mt-24 font-display text-2xl font-semibold tracking-tight">
          {inline(block.slice(2), `h1-${index}`, catalog, localHeadings)}
        </h1>,
      );
      return;
    }

    const split = splitBlockId(block);
    elements.push(
      <p
        key={`p-${index}`}
        id={split.blockId ? `b-${split.blockId}` : undefined}
        className="my-4 scroll-mt-24 text-base leading-[1.85] text-foreground/90"
      >
        {inline(split.text, `p-${index}`, catalog, localHeadings)}
      </p>,
    );
  });

  flushList("ul-end");
  return <div className="article-body">{elements}</div>;
}
