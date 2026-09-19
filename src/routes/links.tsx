import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteChrome } from "@/lib/blog/server";
import { listFriendLinks } from "@/lib/links/server";
import { requirePublicPage } from "@/lib/pages/server";

export const Route = createFileRoute("/links")({
  beforeLoad: () => requirePublicPage("links"),
  loader: async () => {
    const [chrome, links] = await Promise.all([getSiteChrome(), listFriendLinks()]);
    return { chrome, links };
  },
  head: () => ({ meta: [{ title: "友链 - 折页" }] }),
  component: LinksPage,
});

function LinksPage() {
  const { chrome, links } = Route.useLoaderData();
  const groups = [...new Set(links.map((link) => link.groupName))];

  return (
    <SiteShell {...siteChromeProps(chrome)} sidebar>
      <h1 className="text-2xl font-semibold tracking-tight">友情链接</h1>
      <p className="mt-2 text-sm text-muted-foreground">一些值得停下来看看的站点。</p>
      {links.length === 0 ? (
        <Alert variant="muted" className="mt-8">
          <AlertDescription>还没有友链。</AlertDescription>
        </Alert>
      ) : null}
      {groups.map((group) => (
        <section key={group} className="mt-8">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">{group}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {links
              .filter((link) => link.groupName === group)
              .map((link) => (
                <li key={link.id}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    <Card className="shadow-md transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lg">
                      <CardHeader className="p-4">
                        <CardTitle className="font-sans text-base">{link.name}</CardTitle>
                        <CardDescription>{link.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </a>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </SiteShell>
  );
}
