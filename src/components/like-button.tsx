import { Heart } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { toggleLike } from "@/lib/likes/server";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="ghost" className="h-11 gap-1.5 text-muted-foreground">
            <Link to="/login" aria-label="登录后点赞">
              <Heart className="size-4" />
              <span className="tabular-nums">{count}</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>登录后点赞</TooltipContent>
      </Tooltip>
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void onToggle()}
          disabled={pending}
          className={cn("h-11 gap-1.5", liked ? "text-primary" : "text-muted-foreground")}
          aria-pressed={liked}
          aria-label={liked ? "取消点赞" : "点赞"}
        >
          <Heart
            className={cn("folio-heart size-4", liked && "fill-current")}
            data-liked={liked ? "true" : undefined}
          />
          <span className="tabular-nums">{count}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{liked ? "取消点赞" : "点赞"}</TooltipContent>
    </Tooltip>
  );
}
