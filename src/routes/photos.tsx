import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell, siteChromeProps } from "@/components/site-shell";
import { getSiteChrome } from "@/lib/blog/server";
import { listPhotos } from "@/lib/photos/server";
import { formatZhDate } from "@/lib/format";
import { requirePublicPage } from "@/lib/pages/server";

export const Route = createFileRoute("/photos")({
  beforeLoad: () => requirePublicPage("photos"),
  loader: async () => {
    const [chrome, photos] = await Promise.all([getSiteChrome(), listPhotos()]);
    return { chrome, photos };
  },
  head: () => ({ meta: [{ title: "图库 - 折页" }] }),
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
      <div className="mt-6 flex flex-wrap gap-2">
        {groups.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setGroup(item)}
            className={
              item === group
                ? "inline-flex h-9 items-center rounded-full bg-primary px-3 text-sm text-primary-foreground"
                : "inline-flex h-9 items-center rounded-full bg-card px-3 text-sm text-muted-foreground shadow-md hover:text-foreground"
            }
          >
            {item}
          </button>
        ))}
      </div>
      <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {visible.map((photo) => (
          <li key={photo.id} className="overflow-hidden rounded-xl bg-card shadow-md">
            <img src={photo.image} alt={photo.title} className="aspect-16/10 w-full object-cover" />
            <div className="p-4">
              <p className="font-medium">{photo.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{photo.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {photo.groupName} · {formatZhDate(photo.takenAt)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </SiteShell>
  );
}
