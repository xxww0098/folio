import { Node, mergeAttributes } from "@tiptap/core";
import { parseVideoUrl } from "./video-embed";

export const VideoEmbedNode = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-video-src") ?? "",
      },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-video-src]" }, { tag: "figure.folio-video" }];
  },
  renderHTML({ HTMLAttributes }) {
    const info = parseVideoUrl(String(HTMLAttributes.src ?? ""));
    if (!info) {
      return ["p", {}, String(HTMLAttributes.src ?? "")];
    }
    const wrap = mergeAttributes({ class: "folio-video", "data-video-src": info.src });
    if (info.kind === "file") {
      return ["div", wrap, ["video", { controls: "true", src: info.embed }]];
    }
    return [
      "div",
      wrap,
      [
        "iframe",
        {
          src: info.embed,
          title: info.title,
          allowfullscreen: "true",
          loading: "lazy",
        },
      ],
    ];
  },
});
