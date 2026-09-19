import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState, type ReactNode } from "react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  deletePost,
  getAuthorDashboard,
  getPostForEdit,
  listPublishedPosts,
  purgePost,
  restorePost,
  setMemberRole,
  setPostFeatured,
  setPostStatus,
} from "@/lib/blog/server";
import { deleteComment } from "@/lib/comments/server";
import { deleteAttachment, listAttachments, uploadAttachment, type AttachmentItem } from "@/lib/attachments/server";
import { ROLE_LABEL, ROLES, type Role } from "@/lib/roles";
import type { AuthorDashboard, PostDetail, PostListItem } from "@/lib/blog/types";
import { formatZhDate } from "@/lib/format";
import {
  createRedeemCode,
  deleteRedeemCode,
  grantSubscription,
  listMembershipAdmin,
  revokeSubscription,
  type RedeemCodeRow,
  type SubscriberRow,
} from "@/lib/membership/server";
import { ACCESS_LABEL } from "@/lib/membership/access";
import { canWriteRole, workspacePath, type WorkspaceArea } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ObsidianPanel } from "@/components/obsidian-panel";
import { McpPanel } from "@/components/mcp-panel";
import { ThemeGallery } from "@/components/theme-gallery";
import { LinksPanel } from "./links-panel";
import { PagesPanel } from "./pages-panel";
import { ReleaseBanner } from "@/components/release-banner";
import { EntrancePanel } from "@/components/entrance-panel";
import { BackupPanel } from "@/components/backup-panel";
import { StoragePanel } from "@/components/storage-panel";
import { ConsoleDashboard } from "./dashboard";
import { ME_SECTIONS, type ConsoleSection } from "./nav";
import { ConsoleShell } from "./shell";
import { WriteForm } from "@/components/write-form";

export type WorkspaceLoader = {
  posts: PostListItem[];
  dash: AuthorDashboard | null;
  members: { subscribers: SubscriberRow[]; codes: RedeemCodeRow[] };
};

export async function loadWorkspace(area: WorkspaceArea): Promise<WorkspaceLoader> {
  const posts = await listPublishedPosts();
  const scope = area === "me" ? "self" : "all";
  try {
    const dash = await getAuthorDashboard({ data: { scope } });
    let members: WorkspaceLoader["members"] = { subscribers: [], codes: [] };
    if (area === "console") {
      try {
        members = await listMembershipAdmin();
      } catch {
        members = { subscribers: [], codes: [] };
      }
    }
    return { posts, dash, members };
  } catch {
    return { posts, dash: null, members: { subscribers: [], codes: [] } };
  }
}

export function WorkspaceApp({
  area,
  section,
  postId,
  initial,
}: {
  area: WorkspaceArea;
  section: ConsoleSection;
  postId?: number;
  initial: WorkspaceLoader;
}) {
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [dash, setDash] = useState(initial.dash);
  const [members, setMembers] = useState(initial.members);
  const [busy, setBusy] = useState<string | null>(null);
  const [files, setFiles] = useState<AttachmentItem[]>([]);
  const [editPost, setEditPost] = useState<PostDetail | undefined>(undefined);
  const [editReady, setEditReady] = useState(section !== "write" || !postId);
  const scope = area === "me" ? "self" : "all";
  const loginNext = workspacePath(area);

  const userId = user?.id;
  useEffect(() => {
    if (section !== "write" || !postId) {
      setEditPost(undefined);
      setEditReady(true);
      return;
    }
    let cancelled = false;
    setEditReady(false);
    void getPostForEdit({ data: postId })
      .then((post) => {
        if (cancelled) return;
        setEditPost(post ?? undefined);
        setEditReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setEditPost(undefined);
        setEditReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [postId, section]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void listAttachments({ data: { scope } })
      .then((rows) => {
        if (!cancelled) setFiles(rows);
      })
      .catch(() => {
        if (!cancelled) setFiles([]);
      });
    void getAuthorDashboard({ data: { scope } })
      .then(async (next) => {
        if (cancelled) return;
        setDash(next);
        if (area === "console") {
          try {
            setMembers(await listMembershipAdmin());
          } catch {
            if (!cancelled) setMembers({ subscribers: [], codes: [] });
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [area, scope, userId]);

  useEffect(() => {
    if (area !== "console" || !dash) return;
    if (!canWriteRole(dash.role)) {
      void navigate({ to: "/me" });
    }
  }, [area, dash, navigate]);

  async function refresh() {
    const next = await getAuthorDashboard({ data: { scope } });
    setDash(next);
    if (area === "console") {
      try {
        setMembers(await listMembershipAdmin());
      } catch {
        setMembers({ subscribers: [], codes: [] });
      }
    }
  }

  async function onStatus(id: number, status: "draft" | "published") {
    setBusy(`status-${id}`);
    try {
      await setPostStatus({ data: { id, status } });
      toast.success(status === "published" ? "已发布" : "已转为草稿");
      await refresh();
    } catch {
      toast.error("无法更改状态");
    } finally {
      setBusy(null);
    }
  }

  async function onFeatured(id: number, featured: boolean) {
    setBusy(`feat-${id}`);
    try {
      await setPostFeatured({ data: { id, featured } });
      toast.success(featured ? "已置顶" : "已取消置顶");
      await refresh();
    } catch {
      toast.error("无法更改置顶");
    } finally {
      setBusy(null);
    }
  }

  async function onDeletePost(id: number) {
    setBusy(`del-${id}`);
    try {
      await deletePost({ data: id });
      toast.success("已移入回收站");
      await refresh();
    } catch {
      toast.error("无法删除");
    } finally {
      setBusy(null);
    }
  }

  async function onRestore(id: number) {
    setBusy(`restore-${id}`);
    try {
      await restorePost({ data: id });
      toast.success("已恢复");
      await refresh();
    } catch {
      toast.error("无法恢复");
    } finally {
      setBusy(null);
    }
  }

  async function onPurge(id: number) {
    setBusy(`purge-${id}`);
    try {
      await purgePost({ data: id });
      toast.success("已永久删除");
      await refresh();
    } catch {
      toast.error("无法彻底删除");
    } finally {
      setBusy(null);
    }
  }

  async function onDeleteFile(id: number) {
    setBusy(`file-${id}`);
    try {
      await deleteAttachment({ data: id });
      setFiles((current) => current.filter((item) => item.id !== id));
      toast.success("已删除附件");
    } catch {
      toast.error("无法删除附件");
    } finally {
      setBusy(null);
    }
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setBusy("upload");
    try {
      const dataBase64 = await readAsDataUrl(file);
      const item = await uploadAttachment({
        data: {
          filename: file.name,
          mimeType: file.type,
          dataBase64,
          alt: file.name.replace(/\.[^.]+$/, ""),
        },
      });
      setFiles((current) => [item, ...current]);
      toast.success("已上传");
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败";
      toast.error(message === "Unauthorized" ? "请先登录" : message);
    } finally {
      setBusy(null);
    }
  }

  async function onRole(nextUserId: string, role: Role) {
    setBusy(`role-${nextUserId}`);
    try {
      await setMemberRole({ data: { userId: nextUserId, role } });
      toast.success("角色已更新");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法更改角色");
    } finally {
      setBusy(null);
    }
  }

  async function onGrant(nextUserId: string) {
    setBusy(`grant-${nextUserId}`);
    try {
      await grantSubscription({ data: { userId: nextUserId, days: 365 } });
      toast.success("已赠送一年会员");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法赠送");
    } finally {
      setBusy(null);
    }
  }

  async function onRevoke(nextUserId: string) {
    setBusy(`revoke-${nextUserId}`);
    try {
      await revokeSubscription({ data: { userId: nextUserId } });
      toast.success("已取消会员");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法取消");
    } finally {
      setBusy(null);
    }
  }

  async function onCreateCode(days: number) {
    const safe = Math.max(1, Math.min(3650, Math.round(days)));
    const plan = safe >= 180 ? "yearly" : "monthly";
    setBusy("code");
    try {
      const { code } = await createRedeemCode({
        data: {
          plan,
          days: safe,
          maxUses: 5,
          note: "控制台生成",
        },
      });
      toast.success(`已生成 ${safe} 天兑换码 ${code}`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法生成");
    } finally {
      setBusy(null);
    }
  }

  async function onDeleteCode(id: number) {
    setBusy(`code-del-${id}`);
    try {
      await deleteRedeemCode({ data: { id } });
      toast.success("已删除兑换码");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法删除");
    } finally {
      setBusy(null);
    }
  }

  async function onDeleteComment(id: number) {
    try {
      await deleteComment({ data: id });
      await refresh();
    } catch {
      toast.error("无法删除评论");
    }
  }

  const userName = user?.displayName ?? user?.primaryEmail ?? (area === "console" ? "Administrator" : "用户");
  const role = dash?.role ?? null;

  let body: ReactNode;
  if (isPending || (user && !dash)) {
    body = (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-24 rounded-xl bg-console-sidebar" />
        <Skeleton className="h-24 rounded-xl bg-console-sidebar" />
        <Skeleton className="h-24 rounded-xl bg-console-sidebar" />
        <Skeleton className="h-24 rounded-xl bg-console-sidebar" />
      </div>
    );
  } else if (!user) {
    return <Navigate to="/login" search={{ next: loginNext }} />;
  } else if (dash && section === "dashboard") {
    body = (
      <ConsoleDashboard
        area={area}
        dash={dash}
        onRefresh={() => void refresh()}
        refreshing={busy !== null}
      />
    );
  } else if (dash) {
    body = (
      <ConsoleBody
        area={area}
        section={section}
        dash={dash}
        files={files}
        members={members}
        editPost={editPost}
        editReady={editReady}
        busy={busy}
        onRefresh={() => void refresh()}
        onStatus={onStatus}
        onFeatured={onFeatured}
        onDeletePost={onDeletePost}
        onRestore={onRestore}
        onPurge={onPurge}
        onDeleteFile={onDeleteFile}
        onUpload={onUpload}
        onRole={onRole}
        onGrant={onGrant}
        onRevoke={onRevoke}
        onCreateCode={onCreateCode}
        onDeleteCode={onDeleteCode}
        onDeleteComment={onDeleteComment}
      />
    );
  }

  return (
    <ConsoleShell
      area={area}
      section={section}
      userName={userName}
      role={role}
      posts={dash?.posts ?? initial.posts}
      onRefresh={() => void refresh()}
    >
      {body}
    </ConsoleShell>
  );
}

function ConsoleBody({
  area,
  section,
  dash,
  files,
  members,
  editPost,
  editReady,
  busy,
  onRefresh,
  onStatus,
  onFeatured,
  onDeletePost,
  onRestore,
  onPurge,
  onDeleteFile,
  onUpload,
  onRole,
  onGrant,
  onRevoke,
  onCreateCode,
  onDeleteCode,
  onDeleteComment,
}: {
  area: WorkspaceArea;
  section: ConsoleSection;
  dash: AuthorDashboard;
  files: AttachmentItem[];
  members: { subscribers: SubscriberRow[]; codes: RedeemCodeRow[] };
  editPost?: PostDetail;
  editReady?: boolean;
  busy: string | null;
  onRefresh: () => void;
  onStatus: (id: number, status: "draft" | "published") => void;
  onFeatured: (id: number, featured: boolean) => void;
  onDeletePost: (id: number) => void;
  onRestore: (id: number) => void;
  onPurge: (id: number) => void;
  onDeleteFile: (id: number) => void;
  onUpload: (file: File | undefined) => void;
  onRole: (userId: string, role: Role) => void;
  onGrant: (userId: string) => void;
  onRevoke: (userId: string) => void;
  onCreateCode: (days: number) => void;
  onDeleteCode: (id: number) => void;
  onDeleteComment: (id: number) => void;
}) {
  if (area === "me" && !(ME_SECTIONS as readonly string[]).includes(section)) {
    return (
      <Panel>
        <Empty text="站点管理在控制台。这里只看你的评论、会员和账户。" />
      </Panel>
    );
  }

  if (section === "dashboard") {
    return <ConsoleDashboard area={area} dash={dash} onRefresh={onRefresh} refreshing={busy !== null} />;
  }

  if (section === "write") {
    if (!editReady) {
      return (
        <Panel>
          <Empty text="正在打开编辑器…" />
        </Panel>
      );
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <WriteForm key={editPost?.id ?? "new"} post={editPost} />
      </div>
    );
  }

  if (section === "posts") {
    return (
      <Panel
        extra={
          <Button asChild size="sm">
            <Link to="/console" search={{ section: "write" }}>
              写文章
            </Link>
          </Button>
        }
      >
        {dash.posts.length === 0 ? (
          <Empty text={area === "me" ? "你还没有文章。从一篇短的开始。" : "还没有文章。从一篇短的开始。"} />
        ) : (
          <ul className="divide-y divide-console-line">
            {dash.posts.map((post) => (
              <li key={post.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">
                    <Link
                      to="/console"
                      search={{ section: "write", id: post.id }}
                      className="hover:text-console-brand"
                    >
                      {post.title}
                    </Link>
                  </p>
                  <p className="mt-1 text-xs text-console-muted">
                    {post.topic} · {post.status === "published" ? "已发布" : "草稿"}
                    {post.exclusive ? ` · ${ACCESS_LABEL[post.accessMode]}` : ""}
                    {post.updatedAt ? ` · ${formatZhDate(post.updatedAt)}` : ""}
                    {` · ${post.viewCount} 次阅读`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to="/console" search={{ section: "write", id: post.id }}>
                      编辑
                    </Link>
                  </Button>
                  {post.status === "published" ? (
                    <Button size="sm" variant="ghost" disabled={busy === `feat-${post.id}`} onClick={() => onFeatured(post.id, !post.featured)}>
                      {post.featured ? "取消置顶" : "置顶"}
                    </Button>
                  ) : null}
                  {post.status === "published" ? (
                    <Button size="sm" variant="ghost" disabled={busy === `status-${post.id}`} onClick={() => onStatus(post.id, "draft")}>
                      撤回
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={busy === `status-${post.id}`} onClick={() => onStatus(post.id, "published")}>
                      发布
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === `del-${post.id}`} onClick={() => onDeletePost(post.id)}>
                    删除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    );
  }

  if (section === "comments") {
    return (
      <Panel>
        {dash.comments.length === 0 ? (
          <Empty text={area === "me" ? "你还没有发表过评论。" : "还没有收到评论。"} />
        ) : (
          <ul className="divide-y divide-console-line">
            {dash.comments.map((comment) => (
              <li key={comment.id} className="px-5 py-4">
                <p className="text-sm">
                  <span className="font-medium">{comment.authorName}</span>
                  <span className="text-console-muted"> 评论了 </span>
                  {area === "console" ? (
                    <Link to="/console" search={{ section: "write", id: comment.postId }} className="text-console-brand hover:underline">
                      {comment.postTitle}
                    </Link>
                  ) : (
                    <Link to="/posts/$slug" params={{ slug: comment.postSlug }} className="text-console-brand hover:underline">
                      {comment.postTitle}
                    </Link>
                  )}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{comment.body}</p>
                <div className="mt-2 flex items-center justify-between">
                  <time className="text-xs text-console-muted">{formatZhDate(comment.createdAt)}</time>
                  <button type="button" className="text-xs text-console-muted hover:text-destructive" onClick={() => onDeleteComment(comment.id)}>
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    );
  }

  if (section === "files") {
    return (
      <Panel
        extra={
          <label className="inline-flex h-9 cursor-pointer items-center rounded-md bg-primary px-3 text-sm text-primary-foreground">
            {busy === "upload" ? "上传中…" : "上传图片"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={busy === "upload"}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                onUpload(file);
              }}
            />
          </label>
        }
      >
        <p className="px-5 pt-2 text-sm text-console-muted">
          {area === "me" ? "你上传的图片。单张不超过 2 MB。" : "站点封面与已上传的图片。单张不超过 2 MB。"}
        </p>
        {files.length === 0 ? (
          <Empty text="还没有附件。" />
        ) : (
          <ul className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-4">
            {files.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-xl bg-console-quick">
                <img src={item.url} alt={item.alt} className="folio-photo aspect-16/10 w-full object-cover" />
                <div className="flex items-start justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{item.alt || item.filename}</p>
                    <p className="text-xs text-console-muted">
                      {item.groupName}
                      {item.backend === "s3" ? " · 对象存储" : item.backend === "pg" ? " · 数据库" : ""}
                      {item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ""}
                    </p>
                  </div>
                  {item.stored ? (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-console-muted hover:text-destructive"
                      disabled={busy === `file-${item.id}`}
                      onClick={() => onDeleteFile(item.id)}
                    >
                      删除
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    );
  }

  if (section === "obsidian") {
    return (
      <Panel>
        <div className="p-5">
          <ObsidianPanel />
        </div>
      </Panel>
    );
  }

  if (section === "agent") {
    return (
      <Panel>
        <div className="p-5">
          <McpPanel />
        </div>
      </Panel>
    );
  }

  if (section === "appearance") {
    return (
      <Panel>
        <div className="p-5">
          <p className="text-sm text-console-muted">皮肤存在这台设备上，不跟账号走。代码块始终保持深色高亮。</p>
          <div className="mt-6">
            <ThemeGallery compact />
          </div>
          <div className="mt-10">
            <h2 className="text-sm font-semibold text-console-ink">前台栏目</h2>
            <div className="mt-3">
              <PagesPanel />
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  if (section === "links") {
    return (
      <Panel>
        <div className="p-5">
          <LinksPanel />
        </div>
      </Panel>
    );
  }

  if (section === "trash") {
    return (
      <Panel>
        {dash.trash.length === 0 ? (
          <Empty text="回收站是空的。" />
        ) : (
          <ul className="divide-y divide-console-line">
            {dash.trash.map((post) => (
              <li key={post.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{post.title}</p>
                  <p className="mt-1 text-xs text-console-muted">
                    {post.topic} · {post.status === "published" ? "曾发布" : "草稿"}
                    {post.updatedAt ? ` · ${formatZhDate(post.updatedAt)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" disabled={busy === `restore-${post.id}`} onClick={() => onRestore(post.id)}>
                    恢复
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" disabled={busy === `purge-${post.id}`} onClick={() => onPurge(post.id)}>
                    彻底删除
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    );
  }

  if (section === "members") {
    if (dash.role !== "admin") {
      return (
        <Panel>
          <Empty text="只有管理员可以管理成员角色。" />
        </Panel>
      );
    }
    if (dash.members.length === 0) {
      return (
        <Panel>
          <Empty text="还没有其他成员。" />
        </Panel>
      );
    }
    return (
      <Panel>
        <ul className="divide-y divide-console-line">
          {dash.members.map((member) => (
            <li key={member.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">{member.name}</p>
                <p className="mt-1 truncate text-xs text-console-muted">{member.email ?? "未填写邮箱"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={member.role} onValueChange={(value) => onRole(member.id, value as Role)} disabled={busy === `role-${member.id}`}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {ROLE_LABEL[item]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {members.subscribers.some((item) => item.userId === member.id && item.status === "active") ? (
                  <Button size="sm" variant="ghost" disabled={busy === `revoke-${member.id}`} onClick={() => onRevoke(member.id)}>
                    取消会员
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled={busy === `grant-${member.id}`} onClick={() => onGrant(member.id)}>
                    赠送年卡
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    );
  }

  if (section === "plans") {
    if (dash.role !== "admin") {
      return (
        <Panel>
          <Empty text="只有管理员可以管理订阅与兑换码。" />
        </Panel>
      );
    }
    return (
      <div className="space-y-4">
        <Panel>
          <div className="px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-console-brand" />
              订阅
            </h2>
          </div>
          {members.subscribers.length === 0 ? (
            <Empty text="还没有订阅记录。读者可在会员页开通或兑换。" />
          ) : (
            <ul className="divide-y divide-console-line">
              {members.subscribers.map((item) => (
                <li key={item.userId} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-1 text-xs text-console-muted">
                      {item.plan === "monthly"
                        ? "月卡"
                        : item.plan === "monthly_auto"
                          ? "连续包月"
                          : item.plan === "yearly"
                            ? "年卡"
                            : "赠送"}{" "}
                      · {item.status === "active" ? "有效" : "已失效"}
                      {item.expiresAt ? ` · 至 ${formatZhDate(item.expiresAt)}` : ""}
                    </p>
                  </div>
                  {item.status === "active" ? (
                    <Button size="sm" variant="ghost" disabled={busy === `revoke-${item.userId}`} onClick={() => onRevoke(item.userId)}>
                      取消
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <RedeemCodesPanel codes={members.codes} busy={busy} onCreate={onCreateCode} onDelete={onDeleteCode} />
      </div>
    );
  }

  if (section === "entrance") {
    return (
      <Panel>
        {dash.role !== "admin" ? <Empty text="只有管理员可以设置后台入口。" /> : <div className="p-5"><EntrancePanel /></div>}
      </Panel>
    );
  }

  if (section === "storage") {
    return (
      <Panel>
        {dash.role !== "admin" ? <Empty text="只有管理员可以设置存储。" /> : <div className="p-5"><StoragePanel /></div>}
      </Panel>
    );
  }

  if (section === "backup") {
    return (
      <Panel>
        {dash.role !== "admin" ? <Empty text="只有管理员可以备份站点。" /> : <div className="p-5"><BackupPanel /></div>}
      </Panel>
    );
  }

  if (area === "me") {
    return (
      <Panel>
        <div className="space-y-6 p-5">
          <div>
            <h2 className="text-sm font-semibold">账户</h2>
            <p className="mt-2 text-sm text-console-muted">
              当前身份：{ROLE_LABEL[dash.role]}。
              {dash.role === "admin"
                ? "站点管理在控制台。这里只看你的评论、会员和账户。"
                : "注册用户可以评论、开通会员阅读付费文章。"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/membership">会员</Link>
            </Button>
            {dash.role === "admin" ? (
              <Button asChild size="sm">
                <Link to="/console">打开控制台</Link>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void signOut().catch(() => undefined);
              }}
            >
              退出
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <div className="p-5">
          <ReleaseBanner />
          {dash.role !== "admin" ? (
            <p className="mt-4 text-sm text-console-muted">只有管理员可以修改站点设置。</p>
          ) : (
            <div className="mt-2 space-y-10">
              <section>
                <h2 className="text-sm font-semibold">后台入口</h2>
                <div className="mt-3">
                  <EntrancePanel />
                </div>
              </section>
              <section>
                <h2 className="text-sm font-semibold">存储</h2>
                <div className="mt-3">
                  <StoragePanel />
                </div>
              </section>
              <section>
                <h2 className="text-sm font-semibold">备份</h2>
                <div className="mt-3">
                  <BackupPanel />
                </div>
              </section>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function RedeemCodesPanel({
  codes,
  busy,
  onCreate,
  onDelete,
}: {
  codes: RedeemCodeRow[];
  busy: string | null;
  onCreate: (days: number) => void;
  onDelete: (id: number) => void;
}) {
  const [preset, setPreset] = useState<"30" | "365" | "custom">("365");
  const [customDays, setCustomDays] = useState("90");

  function days() {
    if (preset === "30") return 30;
    if (preset === "365") return 365;
    const n = Number(customDays);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

  function generate() {
    const value = days();
    if (value < 1 || value > 3650) {
      toast.error("天数请填 1 到 3650");
      return;
    }
    onCreate(value);
  }

  return (
    <Panel>
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">兑换码</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-console-muted">有效期</span>
            <Button size="sm" variant={preset === "30" ? "default" : "outline"} onClick={() => setPreset("30")}>
              30 天
            </Button>
            <Button size="sm" variant={preset === "365" ? "default" : "outline"} onClick={() => setPreset("365")}>
              365 天
            </Button>
            <Button size="sm" variant={preset === "custom" ? "default" : "outline"} onClick={() => setPreset("custom")}>
              自定义
            </Button>
            {preset === "custom" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  className="h-8 w-24"
                  value={customDays}
                  onChange={(event) => setCustomDays(event.target.value)}
                />
                <span className="text-xs text-console-muted">天</span>
              </div>
            ) : null}
          </div>
        </div>
        <Button size="sm" disabled={busy === "code"} onClick={generate}>
          {busy === "code" ? "生成中…" : "生成"}
        </Button>
      </div>
      {codes.length === 0 ? (
        <Empty text="还没有兑换码。默认 30 天或 365 天，也可自定义天数。" />
      ) : (
        <ul className="divide-y divide-console-line">
          {codes.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0">
                <code className="font-mono text-xs">{item.code}</code>
                <p className="mt-1 text-xs text-console-muted">
                  {item.days === 30 ? "月卡" : item.days === 365 ? "年卡" : "自定义"} · {item.usedCount}/{item.maxUses} · {item.days} 天
                </p>
              </div>
              <Button size="sm" variant="ghost" disabled={busy === `code-del-${item.id}`} onClick={() => onDelete(item.id)}>
                删除
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Panel({ extra, children }: { extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl bg-console-sidebar shadow-[0_1px_2px_var(--color-console-shadow)]">
      {extra ? <div className="flex justify-end px-5 pt-4">{extra}</div> : null}
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="px-5 py-10 text-sm text-console-muted">{text}</p>;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("无法读取文件"));
    reader.readAsDataURL(file);
  });
}
