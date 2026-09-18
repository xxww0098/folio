import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 text-center text-sm text-muted-foreground lg:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link to="/" className="hover:text-foreground">
            首页
          </Link>
          <Link to="/moments" className="hover:text-foreground">
            瞬间
          </Link>
          <Link to="/archive" className="hover:text-foreground">
            归档
          </Link>
          <Link to="/links" className="hover:text-foreground">
            友链
          </Link>
          <Link to="/photos" className="hover:text-foreground">
            图库
          </Link>
          <Link to="/categories" className="hover:text-foreground">
            分类
          </Link>
          <Link to="/tags" className="hover:text-foreground">
            标签
          </Link>
          <Link to="/themes" className="hover:text-foreground">
            主题
          </Link>
          <Link to="/about" className="hover:text-foreground">
            关于
          </Link>
          <Link to="/obsidian" className="hover:text-foreground">
            Obsidian
          </Link>
          <Link to="/mcp" className="hover:text-foreground">
            Agent
          </Link>
          <a href="/rss.xml" className="hover:text-foreground">
            RSS
          </a>
        </div>
        <p>© 2026 折页 · 独立博客</p>
      </div>
    </footer>
  );
}
