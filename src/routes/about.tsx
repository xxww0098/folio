import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { getSiteChrome } from "@/lib/blog/server";

export const Route = createFileRoute("/about")({
  loader: () => getSiteChrome(),
  component: AboutPage,
});

function AboutPage() {
  const chrome = Route.useLoaderData();

  return (
    <SiteShell {...siteChromeProps(chrome)} sidebar>
      <Card className="shadow-md">
        <CardHeader className="p-6 sm:p-8">
          <h1 className="font-sans text-2xl font-semibold tracking-tight">关于折页</h1>
          <CardDescription className="mt-4 text-base leading-relaxed text-foreground/90">
            写给工程师的独立博客。栏目按语言分，正文带可运行的代码。登录后可评论、开通会员阅读付费文章。
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-wrap gap-3 px-6 pb-6 sm:px-8 sm:pb-8">
          <Button asChild>
            <Link to="/membership">会员</Link>
          </Button>
          <Button asChild variant="outline">
            <a href="https://github.com/xxww0098/folio" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </Button>
        </CardFooter>
      </Card>
    </SiteShell>
  );
}
