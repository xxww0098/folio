import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getSiteChrome } from "@/lib/blog/server";
import { listPhotos } from "@/lib/photos/server";
import { formatZhDate } from "@/lib/format";
import { requirePublicPage } from "@/lib/pages/server";
import { ZoomImage } from "@/components/zoom-image";

export const Route = createFileRoute("/photos")({
  beforeLoad: () => requirePublicPage("photos"),
  loader: async () => {
    const [chrome, photos] = await Promise.all([getSiteChrome(), listPhotos()]);
    return { chrome, photos };
  },
  head: () => ({
    meta: [
      { title: "图库 - 折页" },
      { name: "description", content: "折页图库里留下来的画面。" },
    ],
  }),
  component: PhotosPage,
});

function PhotosPage() {
  const { chrome, photos } = Route.useLoaderData();
  const groups = useMemo(() => ["全部", ...new Set(photos.map((photo) => photo.groupName))], [photos]);
  const [group, setGroup] = useState("全部");
  const visible = group === "全部" ? photos : photos.filter((photo) => photo.groupName === group);

  return (
    <SiteShell {...siteChromeProps(chrome)} sidebar>
      <h1 className="text-2xl font-semibold tracking-tight">图库</h1>
      <p className="mt-2 text-sm text-muted-foreground">一些被留下来的画面。</p>
      <ToggleGroup
        type="single"
        value={group}
        onValueChange={(value) => {
          if (value) setGroup(value);
        }}
        variant="outline"
        size="sm"
        className="mt-6 flex flex-wrap justify-start gap-2"
      >
        {groups.map((item) => (
          <ToggleGroupItem key={item} value={item} className="rounded-full px-3">
            {item}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {visible.length === 0 ? (
        <Alert variant="muted" className="mt-6">
          <AlertDescription>这一组还没有照片。</AlertDescription>
        </Alert>
      ) : null}
      <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {visible.map((photo) => (
          <li key={photo.id}>
            <Card className="overflow-hidden shadow-md">
              <ZoomImage src={photo.image} alt={photo.title} className="aspect-16/10 w-full object-cover" />
              <CardContent className="p-4">
                <p className="font-medium">{photo.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{photo.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {photo.groupName} · {formatZhDate(photo.takenAt)}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </SiteShell>
  );
}
