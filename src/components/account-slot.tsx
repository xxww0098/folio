import { Link } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getWorkspaceAccess } from "@/lib/entrance/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

const subscribeToNothing = () => () => {};

export function AccountSlot({ tone = "header" }: { tone?: "header" | "default" }) {
  const { user, isPending } = useCurrentUserState();
  const [canWrite, setCanWrite] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    () => false,
  );

  useEffect(() => {
    if (!user) {
      setCanWrite(false);
      return;
    }
    let cancelled = false;
    void getWorkspaceAccess()
      .then((access) => {
        if (!cancelled) setCanWrite(access.canWrite);
      })
      .catch(() => {
        if (!cancelled) setCanWrite(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isPending) {
    return <Skeleton className={tone === "header" ? "size-9 rounded-full bg-header-foreground/15" : "size-9 rounded-full"} />;
  }

  if (!user) {
    return (
      <Link
        to="/login"
        className={
          tone === "header"
            ? "inline-flex h-11 items-center rounded-md px-3 text-sm text-header-foreground/85 hover:bg-header-foreground/10 hover:text-header-foreground"
            : "inline-flex h-11 items-center rounded-md px-3 text-sm hover:bg-secondary"
        }
      >
        登录
      </Link>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "读者";
  const initial = label.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-h-11 items-center gap-2 rounded-full px-1 outline-none focus-visible:ring-2 focus-visible:ring-header-foreground/40"
          aria-label="账户菜单"
        >
          <Avatar className="size-8">
            {user.profileImageUrl ? <AvatarImage src={user.profileImageUrl} alt="" /> : null}
            <AvatarFallback className={tone === "header" ? "bg-header-foreground/15 text-xs text-header-foreground" : "text-xs"}>
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/me">个人中心</Link>
        </DropdownMenuItem>
        {canWrite ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/console">控制台</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/write">写文章</Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuItem asChild>
          <Link to="/membership">会员</Link>
        </DropdownMenuItem>
        {!gateSession ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                void signOut().catch(() => undefined);
              }}
            >
              退出
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
