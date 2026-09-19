import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteChrome } from "@/lib/blog/server";

export const Route = createFileRoute("/categories")({
  loader: () => getSiteChrome(),
  head: () => ({ meta: [{ title: "分类 - 折页" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const chrome = Route.useLoaderData();
  const cards = chrome.topics.map((topic) => {
    const items = chrome.posts.filter((post) => post.topic === topic);
    return { topic, items, cover: items[0]?.coverImage };
  }).filter((item) => item.items.length > 0);

  return (
    <SiteShell {...siteChromeProps(chrome)} sidebar>
      <h1 className="text-2xl font-semibold tracking-tight">分类</h1>
      <p className="mt-2 text-sm text-muted-foreground">按分类进入对应文章。</p>
      <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.topic}>
            <Link to="/topics/$topic" params={{ topic: card.topic }} className="block">
              <Card className="overflow-hidden shadow-md transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lg">
                {card.cover ? (
                  <img src={card.cover} alt="" className="aspect-16/9 w-full object-cover" />
                ) : null}
                <CardHeader className="p-4">
                  <CardTitle className="font-sans text-base">{card.topic}</CardTitle>
                  <CardDescription className="tabular-nums">{card.items.length} 篇</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </SiteShell>
  );
}
