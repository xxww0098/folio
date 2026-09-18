import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const PAGE_SIZE = 5;

export function PageNav({
  page,
  total,
  to,
}: {
  page: number;
  total: number;
  to: "/";
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const items = Array.from({ length: pages }, (_, index) => index + 1);
  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="分页">
      {items.map((item) => (
        <Link
          key={item}
          to={to}
          search={item > 1 ? { page: item } : {}}
          className={cn(
            "grid size-11 place-items-center rounded-md text-sm",
            item === page ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground shadow-md hover:text-foreground",
          )}
        >
          {item}
        </Link>
      ))}
    </nav>
  );
}
