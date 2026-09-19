import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";

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
    <Pagination className="mt-8">
      <PaginationContent>
        {items.map((item) => (
          <PaginationItem key={item}>
            <Button asChild variant={item === page ? "default" : "outline"} size="icon">
              <Link to={to} search={item > 1 ? { page: item } : {}}>
                {item}
              </Link>
            </Button>
          </PaginationItem>
        ))}
      </PaginationContent>
    </Pagination>
  );
}
