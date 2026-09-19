export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground lg:px-6">
        <a href="/rss.xml" className="hover:text-foreground">
          RSS
        </a>
        <p>© 2026 折页</p>
      </div>
    </footer>
  );
}
