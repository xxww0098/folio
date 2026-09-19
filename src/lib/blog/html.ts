import { parseFence } from "./highlight";

/** Convert the site's markdown dialect into HTML for TipTap. */
export function markdownToHtml(source: string): string {
  const text = source.replace(/\r\n/g, "\n").trim();
  if (!text) return "<p></p>";
  const blocks: string[] = [];
  const fence = /```[\s\S]*?```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(text))) {
    const before = text.slice(last, match.index).trim();
    if (before) blocks.push(...before.split(/\n{2,}/));
    blocks.push(match[0]);
    last = match.index + match[0].length;
  }
  const rest = text.slice(last).trim();
  if (rest) blocks.push(...rest.split(/\n{2,}/));

  return blocks
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("```")) {
        const parsed = parseFence(block);
        const lang = escapeAttr(parsed.lang);
        const file = parsed.filename ? ` data-filename="${escapeAttr(parsed.filename)}"` : "";
        return `<pre><code class="language-${lang}"${file}>${escapeHtml(parsed.code)}</code></pre>`;
      }
      if (block === "---") return "<hr>";
      if (block.startsWith("### ")) return `<h3>${inlineMd(block.slice(4))}</h3>`;
      if (block.startsWith("## ")) return `<h2>${inlineMd(block.slice(3))}</h2>`;
      if (block.startsWith("# ")) return `<h1>${inlineMd(block.slice(2))}</h1>`;
      if (block.startsWith("> ")) {
        const quote = block
          .split("\n")
          .map((line) => line.replace(/^>\s?/, ""))
          .join(" ");
        return `<blockquote><p>${inlineMd(quote)}</p></blockquote>`;
      }
      if (block.startsWith("- ")) {
        const items = block
          .split("\n")
          .map((line) => line.replace(/^- /, "").trim())
          .filter(Boolean)
          .map((item) => `<li>${inlineMd(item)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      if (/^\d+\. /.test(block)) {
        const items = block
          .split("\n")
          .map((line) => line.replace(/^\d+\. /, "").trim())
          .filter(Boolean)
          .map((item) => `<li>${inlineMd(item)}</li>`)
          .join("");
        return `<ol>${items}</ol>`;
      }
      const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(block);
      if (image) return `<p><img src="${escapeAttr(image[2])}" alt="${escapeAttr(image[1])}"></p>`;
      return `<p>${inlineMd(block)}</p>`;
    })
    .join("");
}

function inlineMd(text: string): string {
  return escapeHtml(text)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}">`)
    .replace(/\[\[([^\[\]]+)\]\]/g, (_m, inner) => {
      const pipe = String(inner).indexOf("|");
      const dest = pipe >= 0 ? String(inner).slice(0, pipe).trim() : String(inner).trim();
      const alias = pipe >= 0 ? String(inner).slice(pipe + 1).trim() : "";
      const hash = dest.indexOf("#");
      const target = (hash >= 0 ? dest.slice(0, hash) : dest).replace(/\.md$/i, "");
      const display = alias || (hash >= 0 ? dest.slice(hash + 1).replace(/^\^/, "") : dest) || dest;
      const href = target ? `/posts/${encodeURIComponent(target)}` : hash >= 0 ? `#${dest.slice(hash + 1)}` : "#";
      return `<a href="${escapeAttr(href)}" data-wiki="${escapeAttr(inner)}">${display}</a>`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => `<a href="${escapeAttr(href)}">${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replace(/"/g, "\u0026quot;");
}

export function htmlToMarkdown(html: string): string {
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<div id="root">${html}</div>`, "text/html");
  const root = doc.getElementById("root");
  if (!root) return "";
  return serializeBlocks(root).trim();
}

function serializeBlocks(node: Element): string {
  const parts: string[] = [];
  node.childNodes.forEach((child) => {
    if (child.nodeType !== 1) {
      const text = child.textContent?.trim();
      if (text) parts.push(text);
      return;
    }
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (tag === "h1") parts.push(`# ${inlineText(el)}`);
    else if (tag === "h2") parts.push(`## ${inlineText(el)}`);
    else if (tag === "h3") parts.push(`### ${inlineText(el)}`);
    else if (tag === "blockquote") parts.push(`> ${inlineText(el)}`);
    else if (tag === "ul") {
      const items = [...el.querySelectorAll(":scope > li")].map((li) => `- ${inlineText(li as HTMLElement)}`);
      parts.push(items.join("\n"));
    } else if (tag === "ol") {
      const items = [...el.querySelectorAll(":scope > li")].map((li, i) => `${i + 1}. ${inlineText(li as HTMLElement)}`);
      parts.push(items.join("\n"));
    } else if (tag === "pre") {
      const codeEl = el.querySelector("code");
      const cls = codeEl?.getAttribute("class") ?? el.getAttribute("class") ?? "";
      const lang = /language-([A-Za-z0-9_+-]+)/.exec(cls)?.[1] ?? "";
      const filename = codeEl?.getAttribute("data-filename") ?? el.getAttribute("data-filename") ?? "";
      const fence = filename ? `${lang}:${filename}` : lang;
      parts.push("```" + fence + "\n" + (el.textContent ?? "").replace(/\n$/, "") + "\n```");
    } else if (tag === "hr") parts.push("---");
    else if (tag === "img") {
      const src = el.getAttribute("src") ?? "";
      const alt = el.getAttribute("alt") ?? "";
      parts.push(`![${alt}](${src})`);
    } else if (tag === "p") {
      const img = el.querySelector("img");
      if (img && el.childElementCount === 1) {
        parts.push(`![${img.getAttribute("alt") ?? ""}](${img.getAttribute("src") ?? ""})`);
      } else {
        parts.push(inlineText(el));
      }
    } else {
      const nested = serializeBlocks(el);
      if (nested) parts.push(nested);
      else {
        const text = inlineText(el);
        if (text) parts.push(text);
      }
    }
  });
  return parts.filter(Boolean).join("\n\n");
}

function inlineText(el: HTMLElement): string {
  let out = "";
  el.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      out += child.textContent ?? "";
      return;
    }
    if (child.nodeType !== 1) return;
    const node = child as HTMLElement;
    const tag = node.tagName.toLowerCase();
    if (tag === "strong" || tag === "b") out += `**${inlineText(node)}**`;
    else if (tag === "em" || tag === "i") out += `*${inlineText(node)}*`;
    else if (tag === "code") out += `\`${node.textContent ?? ""}\``;
    else if (tag === "a") {
      const wiki = node.getAttribute("data-wiki");
      const text = inlineText(node);
      if (wiki) {
        const inner = wiki.trim();
        const dest = inner.includes("|") ? inner.slice(0, inner.indexOf("|")).trim() : inner;
        out += text && text !== dest && !inner.includes("|") ? `[[${inner}|${text}]]` : `[[${inner}]]`;
      } else {
        out += `[${text}](${node.getAttribute("href") ?? ""})`;
      }
    }
    else if (tag === "img") out += `![${node.getAttribute("alt") ?? ""}](${node.getAttribute("src") ?? ""})`;
    else if (tag === "br") out += "\n";
    else out += inlineText(node);
  });
  return out.trim();
}
