import { Link } from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore } from "react";
import { signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getWorkspaceAccess } from "@/lib/entrance/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    () => false,
  );

  useEffect(() => {
    if (!user) {
      setCanWrite(false);
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    void getWorkspaceAccess()
      .then((access) => {
        if (cancelled) return;
        setCanWrite(access.canWrite);
        setIsAdmin(access.isAdmin);
      })
      .catch(() => {
        if (cancelled) return;
        setCanWrite(false);
        setIsAdmin(false);
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
      <Button
        asChild
        variant="ghost"
        className={
          tone === "header"
            ? "text-header-foreground/85 hover:bg-header-foreground/10 hover:text-header-foreground"
            : undefined
        }
      >
        <Link to="/login">登录</Link>
      </Button>
    );
  }

  const label = user.displayName ?? user.primaryEmail ?? "读者";
  const initial = label.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="账户菜单"
          className={
            tone === "header"
              ? "rounded-full text-header-foreground hover:bg-header-foreground/10"
              : "rounded-full"
          }
        >
          <Avatar className="size-8">
            {user.profileImageUrl ? <AvatarImage src={user.profileImageUrl} alt="" /> : null}
            <AvatarFallback className={tone === "header" ? "bg-header-foreground/15 text-xs text-header-foreground" : "text-xs"}>
              {initial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to="/me">个人中心</Link>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link to="/console">控制台</Link>
          </DropdownMenuItem>
        ) : null}
        {canWrite ? (
          <DropdownMenuItem asChild>
            <Link to="/console" search={{ section: "write" }}>
              写文章
            </Link>
          </DropdownMenuItem>
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
