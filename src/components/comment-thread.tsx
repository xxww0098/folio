import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { SignInGate } from "@/lib/auth/gates";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { addComment, deleteComment } from "@/lib/comments/server";
import type { CommentItem } from "@/lib/blog/types";
import { formatZhDate } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export function CommentThread({
  postId,
  comments,
  allowComments = true,
}: {
  postId: number;
  comments: CommentItem[];
  allowComments?: boolean;
}) {
  const router = useRouter();
  const user = useCurrentUser();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [pending, setPending] = useState(false);

  const roots = comments.filter((comment) => !comment.parentId);
  const repliesOf = (id: number) => comments.filter((comment) => comment.parentId === id);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setPending(true);
    try {
      await addComment({
        data: { postId, body: body.trim(), parentId: replyTo?.id ?? null },
      });
      setBody("");
      setReplyTo(null);
      toast.success(replyTo ? "回复已发布" : "评论已发布");
      await router.invalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(message || "没能送出，请稍后再试");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteComment({ data: id });
      await router.invalidate();
    } catch {
      toast.error("无法删除这条评论");
    }
  }

  return (
    <section className="mt-16">
      <Separator />
      <div className="mb-8 mt-10 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold">评论</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{comments.length} 条</span>
      </div>

      {!allowComments ? (
        <Alert variant="muted" className="mb-10">
          <AlertDescription>本文已关闭评论。</AlertDescription>
        </Alert>
      ) : (
        <SignInGate
          fallback={
            <Alert variant="muted" className="mb-10">
              <AlertDescription>
                登录或注册后可以发表评论。
                <Button asChild variant="link" className="h-auto px-1">
                  <Link to="/login">前往登录</Link>
                </Button>
              </AlertDescription>
            </Alert>
          }
        >
          <form onSubmit={onSubmit} className="mb-10 space-y-3">
            {replyTo ? (
              <p className="text-xs text-muted-foreground">
                回复 {replyTo.authorName}
                <Button type="button" variant="link" className="ml-1 h-auto px-1" onClick={() => setReplyTo(null)}>
                  取消
                </Button>
              </p>
            ) : null}
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={replyTo ? `回复 ${replyTo.authorName}` : "写评论"}
              maxLength={1000}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={pending || body.trim().length < 2}>
                {pending ? "发布中…" : replyTo ? "发表回复" : "发表评论"}
              </Button>
            </div>
          </form>
        </SignInGate>
      )}

      <ol className="space-y-6">
        {roots.length === 0 ? (
          <li>
            <Alert variant="muted">
              <AlertDescription>还没有评论，来写第一条。</AlertDescription>
            </Alert>
          </li>
        ) : (
          roots.map((comment) => (
            <li key={comment.id} className="border-b border-border pb-5 last:border-0">
              <CommentItemView
                comment={comment}
                currentUserId={user?.id}
                onReply={allowComments ? () => setReplyTo(comment) : undefined}
                onDelete={onDelete}
              />
              {repliesOf(comment.id).length ? (
                <ol className="mt-4 space-y-4 border-l border-border pl-3 sm:pl-4">
                  {repliesOf(comment.id).map((reply) => (
                    <li key={reply.id}>
                      <CommentItemView
                        comment={reply}
                        currentUserId={user?.id}
                        onDelete={onDelete}
                      />
                    </li>
                  ))}
                </ol>
              ) : null}
            </li>
          ))
        )}
      </ol>
    </section>
  );
}

function CommentItemView({
  comment,
  currentUserId,
  onReply,
  onDelete,
}: {
  comment: CommentItem;
  currentUserId?: string;
  onReply?: () => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="flex gap-3">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{comment.authorName.slice(0, 1)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{comment.authorName}</p>
          <div className="flex items-center gap-1">
            <time className="px-1 text-xs text-muted-foreground">{formatZhDate(comment.createdAt)}</time>
            {onReply ? (
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onReply}>
                回复
              </Button>
            ) : null}
            {currentUserId === comment.userId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(comment.id)}
              >
                删除
              </Button>
            ) : null}
          </div>
        </div>
        <p className="text-sm leading-relaxed">{comment.body}</p>
      </div>
    </div>
  );
}
