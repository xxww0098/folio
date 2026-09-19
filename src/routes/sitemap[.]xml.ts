import { createFileRoute } from "@tanstack/react-router";
import { listPublishedPosts } from "@/lib/blog/server";
import { FRONT_PAGE_META } from "@/lib/pages/visibility";
import { getFrontPages } from "@/lib/pages/server";

const ENT: Record<string, string> = {
  "&": "\u0026amp;",
  "<": "\u0026lt;",
  ">": "\u0026gt;",
  '"': "\u0026quot;",
};

function escapeXml(value: string) {
  return value.replace(/[&<>"]/g, (ch) => ENT[ch] ?? ch);
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const posts = await listPublishedPosts();
        const pages = await getFrontPages();
        const staticPaths = [
          "/",
          "/categories",
          "/tags",
          "/about",
          ...Object.entries(FRONT_PAGE_META)
            .filter(([key]) => pages[key as keyof typeof pages])
            .map(([, meta]) => meta.path),
        ];
        const urls = [
          ...staticPaths.map((path) => ({ loc: `${origin}${path}`, lastmod: "" })),
          ...posts.map((post) => ({
            loc: `${origin}/posts/${post.slug}`,
            lastmod: post.publishedAt ? new Date(post.publishedAt).toISOString() : "",
          })),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (item) =>
      `<url><loc>${escapeXml(item.loc)}</loc>${item.lastmod ? `<lastmod>${escapeXml(item.lastmod)}</lastmod>` : ""}</url>`,
  )
  .join("\n")}
</urlset>`;
        return new Response(body, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
