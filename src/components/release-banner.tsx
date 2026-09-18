import { useEffect, useState } from "react";
import { CURRENT_VERSION, GITHUB_RELEASES_URL, fetchLatestRelease, isNewerRelease } from "@/lib/release";

export function ReleaseBanner() {
  const [latest, setLatest] = useState<string | null>(null);
  const [url, setUrl] = useState(GITHUB_RELEASES_URL);

  useEffect(() => {
    const control = new AbortController();
    fetchLatestRelease(control.signal)
      .then((release) => {
        if (!release) return;
        setLatest(release.tag);
        setUrl(release.url);
      })
      .catch(() => undefined);
    return () => control.abort();
  }, []);

  const update = latest && isNewerRelease(CURRENT_VERSION, latest);

  return (
    <p className="mt-3 text-xs text-muted-foreground">
      当前版本 <span className="font-mono">v{CURRENT_VERSION.replace(/^v/, "")}</span>
      {update ? (
        <>
          {" "}
          · 新版本{" "}
          <a href={url} className="font-mono text-primary hover:underline" target="_blank" rel="noreferrer">
            {latest}
          </a>{" "}
          已在 GitHub Release 发布，自托管请执行{" "}
          <span className="font-mono">./scripts/update-from-release.sh</span>
        </>
      ) : latest ? (
        <> · 已是 GitHub 最新 Release</>
      ) : null}
    </p>
  );
}
