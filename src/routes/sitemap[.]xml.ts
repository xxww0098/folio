import { createFileRoute } from "@tanstack/react-router";
import { listPublishedPosts } from "@/lib/blog/server";

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
        const staticPaths = ["/", "/archive", "/categories", "/tags", "/moments", "/photos", "/links", "/about"];
        const urls = [
          ...staticPaths.map((path) => `${origin}${path}`),
          ...posts.map((post) => `${origin}/posts/${post.slug}`),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((loc) => `<url><loc>${escapeXml(loc)}</loc></url>`).join("\n")}
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
