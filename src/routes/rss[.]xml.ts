import { createFileRoute } from "@tanstack/react-router";
import { listPublishedPosts } from "@/lib/blog/server";

const ENT: Record<string, string> = {
  "&": "\u0026amp;",
  "<": "\u0026lt;",
  ">": "\u0026gt;",
  '"': "\u0026quot;",
  "'": "\u0026apos;",
};

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ENT[ch] ?? ch);
}

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const posts = await listPublishedPosts();
        const items = posts
          .map((post) => {
            const link = `${origin}/posts/${post.slug}`;
            const gated = post.exclusive ? "（会员抢先）" : "";
            return `<item>
<title>${escapeXml(post.title)}</title>
<link>${escapeXml(link)}</link>
<guid>${escapeXml(link)}</guid>
<pubDate>${post.publishedAt ? new Date(post.publishedAt).toUTCString() : ""}</pubDate>
<description>${escapeXml(`${post.excerpt}${gated}`)}</description>
</item>`;
          })
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>折页</title>
<link>${escapeXml(origin)}</link>
<description>写给工程师的独立博客。类型系统、并发模型、数据库与工具链。</description>
<language>zh-CN</language>
${items}
</channel>
</rss>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
