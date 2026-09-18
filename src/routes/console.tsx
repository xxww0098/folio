import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { FileText, Heart, MessageCircle, PenLine, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  deletePost,
  getAuthorDashboard,
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
import type { AuthorDashboard } from "@/lib/blog/types";
import { formatZhDate } from "@/lib/format";
import {
  createRedeemCode,
  grantSubscription,
  listMembershipAdmin,
  revokeSubscription,
  type RedeemCodeRow,
  type SubscriberRow,
} from "@/lib/membership/server";
import { ACCESS_LABEL } from "@/lib/membership/access";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SiteShell } from "@/components/site-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObsidianPanel } from "@/components/obsidian-panel";
import { McpPanel } from "@/components/mcp-panel";
import { ThemeGallery } from "@/components/theme-gallery";
import { ReleaseBanner } from "@/components/release-banner";
import { EntrancePanel } from "@/components/entrance-panel";
import { BackupPanel } from "@/components/backup-panel";
import { StoragePanel } from "@/components/storage-panel";
import { MissingPage } from "@/components/missing-page";
import { getBackendAccess } from "@/lib/entrance/server";

export const Route = createFileRoute("/console")({
  beforeLoad: async () => {
    const access = await getBackendAccess();
    if (!access.unlocked) throw notFound();
  },
  loader: async () => {
    const posts = await listPublishedPosts();
    try {
      const dash = await getAuthorDashboard();
      let members: { subscribers: SubscriberRow[]; codes: RedeemCodeRow[] } = { subscribers: [], codes: [] };
      try {
        members = await listMembershipAdmin();
      } catch {
        members = { subscribers: [], codes: [] };
      }
      return { posts, dash, members };
    } catch {
      return { posts, dash: null as AuthorDashboard | null, members: { subscribers: [], codes: [] } };
    }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? "控制台 - 折页" : "折页 Folio" }],
  }),
  notFoundComponent: MissingPage,
  component: ConsolePage,
});

function ConsolePage() {
  const { posts, dash: initial, members: initialMembers } = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const [dash, setDash] = useState(initial);
  const [members, setMembers] = useState(initialMembers);
  const [busy, setBusy] = useState<string | null>(null);
  const [files, setFiles] = useState<AttachmentItem[]>([]);

  useEffect(() => {
    if (!user) return;
    void listAttachments()
      .then(setFiles)
      .catch(() => setFiles([]));
  }, [user]);

  async function refresh() {
    const next = await getAuthorDashboard();
    setDash(next);
    try {
      setMembers(await listMembershipAdmin());
    } catch {
      setMembers({ subscribers: [], codes: [] });
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

  async function onRole(userId: string, role: Role) {
    setBusy(`role-${userId}`);
    try {
      await setMemberRole({ data: { userId, role } });
      toast.success("角色已更新");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法更改角色");
    } finally {
      setBusy(null);
    }
  }

  async function onGrant(userId: string) {
    setBusy(`grant-${userId}`);
    try {
      await grantSubscription({ data: { userId, days: 365 } });
      toast.success("已赠送一年会员");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法赠送");
    } finally {
      setBusy(null);
    }
  }

  async function onRevoke(userId: string) {
    setBusy(`revoke-${userId}`);
    try {
      await revokeSubscription({ data: { userId } });
      toast.success("已取消会员");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法取消");
    } finally {
      setBusy(null);
    }
  }

  async function onCreateCode() {
    setBusy("code");
    try {
      const { code } = await createRedeemCode({ data: { days: 365, maxUses: 5, note: "控制台生成" } });
      toast.success(`已生成 ${code}`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法生成");
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

  return (
    <SiteShell posts={posts}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">控制台</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {dash ? `${ROLE_LABEL[dash.role]} · 文章、附件、Obsidian、Agent 与外观` : "管理文章、附件、回收站与成员。"}
            </p>
            <ReleaseBanner />
          </div>
          <Button asChild>
            <Link to="/write">写文章</Link>
          </Button>
        </div>

        {isPending ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : !user || !dash ? (
          <div className="mt-10">
            <RedirectToSignIn />
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Stat icon={FileText} label="文章" value={dash.postCount} />
              <Stat icon={PenLine} label="草稿" value={dash.draftCount} />
              <Stat icon={MessageCircle} label="评论" value={dash.commentCount} />
              <Stat icon={Heart} label="获赞" value={dash.likeCount} />
              <Stat icon={Trash2} label="回收站" value={dash.trash.length} />
            </div>

            <Tabs defaultValue="posts" className="mt-10">
              <TabsList className="h-auto w-full flex-wrap justify-start">
                <TabsTrigger value="posts">文章</TabsTrigger>
                <TabsTrigger value="comments">评论</TabsTrigger>
                <TabsTrigger value="files">附件</TabsTrigger>
                <TabsTrigger value="obsidian">Obsidian</TabsTrigger>
                <TabsTrigger value="agent">Agent</TabsTrigger>
                <TabsTrigger value="appearance">外观</TabsTrigger>
                <TabsTrigger value="trash">回收站</TabsTrigger>
                <TabsTrigger value="members">成员</TabsTrigger>
                <TabsTrigger value="plans">会员</TabsTrigger>
                <TabsTrigger value="entrance">入口</TabsTrigger>
                <TabsTrigger value="storage">存储</TabsTrigger>
                <TabsTrigger value="backup">备份</TabsTrigger>
              </TabsList>
              <TabsContent value="posts">
                {dash.posts.length === 0 ? (
                  <p className="mt-6 text-sm text-muted-foreground">还没有文章。从一篇短的开始。</p>
                ) : (
                  <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-md">
                    {dash.posts.map((post) => (
                      <li key={post.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">
                            <Link to="/posts/$slug" params={{ slug: post.slug }} className="hover:text-primary">
                              {post.title}
                            </Link>
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {post.topic} · {post.status === "published" ? "已发布" : "草稿"}
                            {post.exclusive ? ` · ${ACCESS_LABEL[post.accessMode]}` : ""}
                            {post.updatedAt ? ` · ${formatZhDate(post.updatedAt)}` : ""}
                            {` · ${post.viewCount} 次阅读`}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link to="/write/$id" params={{ id: String(post.id) }}>
                              编辑
                            </Link>
                          </Button>
                          {post.status === "published" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy === `feat-${post.id}`}
                              onClick={() => void onFeatured(post.id, !post.featured)}
                            >
                              {post.featured ? "取消置顶" : "置顶"}
                            </Button>
                          ) : null}
                          {post.status === "published" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy === `status-${post.id}`}
                              onClick={() => void onStatus(post.id, "draft")}
                            >
                              撤回
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy === `status-${post.id}`}
                              onClick={() => void onStatus(post.id, "published")}
                            >
                              发布
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            disabled={busy === `del-${post.id}`}
                            onClick={() => void onDeletePost(post.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
              <TabsContent value="comments">
                {dash.comments.length === 0 ? (
                  <p className="mt-6 text-sm text-muted-foreground">还没有收到评论。</p>
                ) : (
                  <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-md">
                    {dash.comments.map((comment) => (
                      <li key={comment.id} className="px-5 py-4">
                        <p className="text-sm">
                          <span className="font-medium">{comment.authorName}</span>
                          <span className="text-muted-foreground"> 评论了 </span>
                          <Link to="/posts/$slug" params={{ slug: comment.postSlug }} className="text-primary hover:underline">
                            {comment.postTitle}
                          </Link>
                        </p>
                        <p className="mt-2 text-sm leading-relaxed">{comment.body}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <time className="text-xs text-muted-foreground">{formatZhDate(comment.createdAt)}</time>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => void onDeleteComment(comment.id)}
                          >
                            删除
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
              <TabsContent value="files">
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">站点封面与已上传的图片。单张不超过 2 MB。</p>
                  <label className="inline-flex h-11 cursor-pointer items-center rounded-md bg-primary px-3 text-sm text-primary-foreground">
                    {busy === "upload" ? "上传中…" : "上传图片"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={busy === "upload"}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        void onUpload(file);
                      }}
                    />
                  </label>
                </div>
                {files.length === 0 ? (
                  <p className="mt-6 text-sm text-muted-foreground">还没有附件。</p>
                ) : (
                  <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {files.map((item) => (
                      <li key={item.id} className="overflow-hidden rounded-xl bg-card shadow-md">
                        <img src={item.url} alt={item.alt} className="folio-photo aspect-16/10 w-full object-cover" />
                        <div className="flex items-start justify-between gap-2 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm">{item.alt || item.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.groupName}
                              {item.backend === "s3" ? " · 对象存储" : item.backend === "pg" ? " · 数据库" : ""}
                              {item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ""}
                            </p>
                          </div>
                          {item.stored ? (
                            <button
                              type="button"
                              className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                              disabled={busy === `file-${item.id}`}
                              onClick={() => void onDeleteFile(item.id)}
                            >
                              删除
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
              <TabsContent value="obsidian">
                <ObsidianPanel />
              </TabsContent>
              <TabsContent value="agent">
                <div className="mt-4">
                  <McpPanel />
                </div>
              </TabsContent>
              <TabsContent value="appearance">
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">
                    皮肤存在这台设备上，不跟账号走。代码块始终保持深色高亮。
                  </p>
                  <div className="mt-6">
                    <ThemeGallery compact />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="trash">
                {dash.trash.length === 0 ? (
                  <p className="mt-6 text-sm text-muted-foreground">回收站是空的。</p>
                ) : (
                  <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-md">
                    {dash.trash.map((post) => (
                      <li key={post.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">{post.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {post.topic} · {post.status === "published" ? "曾发布" : "草稿"}
                            {post.updatedAt ? ` · ${formatZhDate(post.updatedAt)}` : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === `restore-${post.id}`}
                            onClick={() => void onRestore(post.id)}
                          >
                            恢复
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            disabled={busy === `purge-${post.id}`}
                            onClick={() => void onPurge(post.id)}
                          >
                            彻底删除
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
              <TabsContent value="members">
                {dash.role !== "admin" ? (
                  <p className="mt-6 text-sm text-muted-foreground">只有管理员可以管理成员角色。</p>
                ) : dash.members.length === 0 ? (
                  <p className="mt-6 text-sm text-muted-foreground">还没有其他成员。</p>
                ) : (
                  <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-md">
                    {dash.members.map((member) => (
                      <li key={member.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">{member.name}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{member.email ?? "未填写邮箱"}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(value) => void onRole(member.id, value as Role)}
                            disabled={busy === `role-${member.id}`}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {ROLE_LABEL[role]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {members.subscribers.some((item) => item.userId === member.id && item.status === "active") ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy === `revoke-${member.id}`}
                              onClick={() => void onRevoke(member.id)}
                            >
                              取消会员
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === `grant-${member.id}`}
                              onClick={() => void onGrant(member.id)}
                            >
                              赠送年卡
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
              <TabsContent value="plans">
                {dash.role !== "admin" ? (
                  <p className="mt-6 text-sm text-muted-foreground">只有管理员可以管理订阅与兑换码。</p>
                ) : (
                  <div className="mt-4 space-y-8">
                    <section>
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-sm font-semibold">
                          <Sparkles className="size-4 text-primary" />
                          订阅
                        </h2>
                      </div>
                      {members.subscribers.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">还没有订阅记录。读者可在会员页开通或兑换。</p>
                      ) : (
                        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-md">
                          {members.subscribers.map((item) => (
                            <li key={item.userId} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.plan === "monthly" ? "月卡" : item.plan === "yearly" ? "年卡" : "赠送"} · {item.status === "active" ? "有效" : "已失效"}
                                  {item.expiresAt ? ` · 至 ${formatZhDate(item.expiresAt)}` : ""}
                                </p>
                              </div>
                              {item.status === "active" ? (
                                <Button size="sm" variant="ghost" disabled={busy === `revoke-${item.userId}`} onClick={() => void onRevoke(item.userId)}>
                                  取消
                                </Button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                    <section>
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-semibold">兑换码</h2>
                        <Button size="sm" variant="outline" disabled={busy === "code"} onClick={() => void onCreateCode()}>
                          生成年卡码
                        </Button>
                      </div>
                      <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-md">
                        {members.codes.map((item) => (
                          <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                            <code className="font-mono text-xs">{item.code}</code>
                            <span className="text-xs text-muted-foreground">
                              {item.usedCount}/{item.maxUses} · {item.days} 天
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="entrance">
                {dash.role !== "admin" ? (
                  <p className="mt-6 text-sm text-muted-foreground">只有管理员可以设置后台入口。</p>
                ) : (
                  <EntrancePanel />
                )}
              </TabsContent>
              <TabsContent value="storage">
                {dash.role !== "admin" ? (
                  <p className="mt-6 text-sm text-muted-foreground">只有管理员可以设置存储。</p>
                ) : (
                  <StoragePanel />
                )}
              </TabsContent>
              <TabsContent value="backup">
                {dash.role !== "admin" ? (
                  <p className="mt-6 text-sm text-muted-foreground">只有管理员可以备份站点。</p>
                ) : (
                  <BackupPanel />
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </SiteShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-card p-4 shadow-md">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
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
