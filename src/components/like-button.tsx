import { Heart } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { toggleLike } from "@/lib/likes/server";
import { cn } from "@/lib/utils";

export function LikeButton({
  postId,
  initialCount,
  initialLiked,
}: {
  postId: number;
  initialCount: number;
  initialLiked: boolean;
}) {
  const user = useCurrentUser();
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [pending, setPending] = useState(false);

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        aria-label="登录后点赞"
      >
        <Heart className="size-4" />
        <span className="tabular-nums">{count}</span>
      </Link>
    );
  }

  async function onToggle() {
    if (pending) return;
    setPending(true);
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((value) => value + (nextLiked ? 1 : -1));
    try {
      const result = await toggleLike({ data: postId });
      setLiked(result.liked);
      setCount(result.count);
    } catch {
      setLiked(!nextLiked);
      setCount((value) => value + (nextLiked ? -1 : 1));
      toast.error("没能点赞，请稍后再试");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onToggle()}
      disabled={pending}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 text-sm",
        liked ? "text-primary" : "text-muted-foreground hover:text-primary",
      )}
      aria-pressed={liked}
      aria-label={liked ? "取消点赞" : "点赞"}
    >
      <Heart
        className={cn("folio-heart size-4", liked && "fill-current")}
        data-liked={liked ? "true" : undefined}
      />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
