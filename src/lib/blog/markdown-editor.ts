import { Extension, InputRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { markdownToHtml } from "./html";
import { parseWikiInner, resolveWikiTarget, wikiDisplay, type WikiCatalogItem } from "./wikilink";

function looksLikeMarkdown(text: string) {
  return /```|^\s{0,3}#{1,3}\s|^\s*[-*+]\s|^\s*\d+\.\s|^\s*>\s|\*\*[^*]+\*\*|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|^---$|\[\[[^\]]+\]\]/m.test(
    text,
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/"/g, "\u0026quot;");
}
function wikiHref(inner: string, catalog: WikiCatalogItem[]) {
  const link = parseWikiInner(inner);
  const note = link.target ? resolveWikiTarget(link.target, catalog) : undefined;
  if (note) return `/posts/${note.slug}`;
  if (link.target) return `/posts/${link.target}`;
  if (link.heading) return `#${link.heading}`;
  return "#";
}

export function markdownEditorExtension(catalogRef: { current: WikiCatalogItem[] }) {
  return Extension.create({
    name: "markdownEase",
    addInputRules() {
      return [
        new InputRule({
          find: /!\[([^\]]*)\]\(([^)]+)\)$/,
          handler: ({ range, match, chain }) => {
            chain().deleteRange(range).setImage({ src: match[2], alt: match[1] }).run();
          },
        }),
        new InputRule({
          find: /(?<!\!)\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/,
          handler: ({ range, match, chain }) => {
            const href = escapeHtml(match[2]);
            const label = escapeHtml(match[1]);
            chain().deleteRange(range).insertContent(`<a href="${href}">${label}</a>`).run();
          },
        }),
        new InputRule({
          find: /\[\[([^\[\]]+)\]\]$/,
          handler: ({ range, match, chain }) => {
            const inner = match[1];
            const catalog = catalogRef.current;
            const link = parseWikiInner(inner);
            const note = link.target ? resolveWikiTarget(link.target, catalog) : undefined;
            const href = wikiHref(inner, catalog);
            const label = wikiDisplay(link) || note?.title || inner;
            const wiki = escapeHtml(inner);
            const text = escapeHtml(label);
            chain().deleteRange(range).insertContent(`<a href="${href}" data-wiki="${wiki}">${text}</a>`).run();
          },
        }),
      ];
    },
    addProseMirrorPlugins() {
      const editor = this.editor;
      return [
        new Plugin({
          key: new PluginKey("markdownPaste"),
          props: {
            handlePaste(_view, event) {
              const text = event.clipboardData?.getData("text/plain") ?? "";
              const html = event.clipboardData?.getData("text/html") ?? "";
              if (!text.trim() || !looksLikeMarkdown(text)) return false;
              if (html && /<(table|span style=)/i.test(html) && !/```|^\s{0,3}#{1,3}\s/m.test(text)) {
                return false;
              }
              editor.commands.insertContent(markdownToHtml(text));
              return true;
            },
          },
        }),
      ];
    },
  });
}
