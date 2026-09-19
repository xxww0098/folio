import type { ReactElement } from "react";
import { Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";

export function MissingPage({
  title = "页面不存在",
  hint = "404",
}: {
  title?: string;
  hint?: string;
} = {}): ReactElement {
  return (
    <SiteShell>
      <div className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-4 py-24">
        <Card className="w-full text-center shadow-md">
          <CardHeader>
            <CardDescription>{hint}</CardDescription>
            <h1 className="font-sans text-2xl font-medium leading-tight">{title}</h1>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button asChild variant="link">
              <Link to="/">返回首页</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </SiteShell>
  );
}
