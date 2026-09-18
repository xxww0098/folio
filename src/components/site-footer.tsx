import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground lg:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a href="/rss.xml" className="hover:text-foreground">
            RSS
          </a>
          <Link to="/themes" className="hover:text-foreground">
            主题
          </Link>
          <Link to="/obsidian" className="hover:text-foreground">
            Obsidian
          </Link>
          <Link to="/mcp" className="hover:text-foreground">
            Agent
          </Link>
        </div>
        <p>© 2026 折页</p>
      </div>
    </footer>
  );
}
