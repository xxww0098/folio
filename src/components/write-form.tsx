import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createPost, deletePost, getWikiCatalog, listRevisions, restoreRevision, updatePost } from "@/lib/blog/server";
import { ArticleBody } from "@/lib/blog/markdown";
import { type PostDetail, type PostRevision, type PostStatus } from "@/lib/blog/types";
import { getTopics } from "@/lib/topics/server";
import { ACCESS_LABEL, ACCESS_MODES, EXCLUSIVE_DAY_OPTIONS, type AccessMode } from "@/lib/membership/access";
import { buildWikiGraph, type WikiCatalogItem } from "@/lib/blog/wikilink";
import { formatZhDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/media-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { VisualEditor } from "@/components/visual-editor";
import { WikiSuggestMenu } from "@/components/wiki-suggest-menu";
import { uploadAttachment } from "@/lib/attachments/server";

const COVERS = [
  { value: "/covers/01-ts.jpg", label: "夜间书桌" },
  { value: "/covers/02-rust.jpg", label: "铜齿轮" },
  { value: "/covers/03-go.jpg", label: "青绿玻璃" },
  { value: "/covers/04-python.jpg", label: "键盘与绿玻璃" },
  { value: "/covers/05-sql.jpg", label: "层叠圆盘" },
  { value: "/covers/06-zig.jpg", label: "橙色几何" },
  { value: "/covers/07-arch.jpg", label: "嵌套模型" },
];

export function WriteForm({ post }: { post?: PostDetail }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [topic, setTopic] = useState(post?.topic ?? "");
  const [topics, setTopics] = useState<string[]>(post?.topic ? [post.topic] : []);
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? COVERS[0].value);
  const [tags, setTags] = useState((post?.tags ?? []).map((tag) => tag.name).join("，"));
  const [allowComments, setAllowComments] = useState(post?.allowComments !== false);
  const [accessMode, setAccessMode] = useState<AccessMode>(post?.accessMode ?? "public");
  const [exclusiveDays, setExclusiveDays] = useState(String(post?.exclusiveDays ?? 7));
  const [pending, setPending] = useState<"published" | "draft" | "delete" | null>(null);
  const [picker, setPicker] = useState<"cover" | "body" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wikiQuery, setWikiQuery] = useState("");
  const [mode, setMode] = useState<"visual" | "source" | "preview">("visual");
  const [revisions, setRevisions] = useState<PostRevision[]>([]);
  const [catalog, setCatalog] = useState<WikiCatalogItem[]>(post?.wiki.catalog ?? []);
  const [postId, setPostId] = useState<number | null>(post?.id ?? null);
  const [liveStatus, setLiveStatus] = useState<PostStatus>(post?.status ?? "draft");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const skipAutosave = useRef(true);
  const saveGen = useRef(0);
  const creating = useRef(false);

  useEffect(() => {
    void getWikiCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(post?.wiki.catalog ?? []));
  }, [post?.wiki.catalog]);

  useEffect(() => {
    void getTopics()
      .then((list) => {
        const next = post?.topic && !list.includes(post.topic) ? [post.topic, ...list] : list;
        setTopics(next);
        setTopic((current) => current || next[0] || "");
      })
      .catch(() => undefined);
  }, [post?.topic]);

  useEffect(() => {
    if (!post) return;
    void listRevisions({ data: post.id })
      .then(setRevisions)
      .catch(() => setRevisions([]));
  }, [post]);

  function payload(status: PostStatus, recordRevision: boolean) {
    return {
      title: title.trim(),
      excerpt: excerpt.trim(),
      body: body.trim(),
      topic,
      coverImage,
      coverAlt: title.trim(),
      status,
      tags: tags
        .split(/[,，\s]+/)
        .map((item) => item.trim())
        .filter(Boolean),
      allowComments,
      accessMode,
      exclusiveDays: Number(exclusiveDays) || 7,
      recordRevision,
    };
  }

  async function persist(status: PostStatus, silent: boolean) {
    const gen = ++saveGen.current;
    if (silent) setSaveState("saving");
    else setPending(status === "published" ? "published" : "draft");
    try {
      const data = payload(status, !silent);
      if (postId) {
        await updatePost({ data: { id: postId, ...data } });
        if (gen !== saveGen.current) return;
        setLiveStatus(status);
        if (!silent) {
          toast.success(status === "published" ? "已发布" : "草稿已保存");
          const next = await listRevisions({ data: postId }).catch(() => []);
          if (gen === saveGen.current) setRevisions(next);
        }
      } else {
        if (creating.current) return;
        creating.current = true;
        const result = await createPost({ data });
        creating.current = false;
        if (gen !== saveGen.current) return;
        setPostId(result.id);
        setLiveStatus(status);
        skipAutosave.current = true;
        if (!silent) toast.success(status === "published" ? "已发布" : "草稿已保存");
        await navigate({ to: "/console", search: { section: "write", id: result.id } });
      }
      if (gen === saveGen.current) setSaveState("saved");
    } catch (error) {
      creating.current = false;
      if (gen !== saveGen.current) return;
      setSaveState("error");
      if (!silent) {
        const message = error instanceof Error ? error.message : "没能保存";
        toast.error(message === "Unauthorized" ? "请先登录" : message);
      }
    } finally {
      if (!silent) setPending(null);
    }
  }

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    const dirty = title.trim() || excerpt.trim() || body.trim();
    if (!postId && !dirty) return;
    const timer = window.setTimeout(() => {
      const nextStatus = liveStatus === "published" ? "published" : "draft";
      if (nextStatus === "published" && (!title.trim() || !excerpt.trim() || body.trim().length < 20)) {
        return;
      }
      void persist(nextStatus, true);
    }, 800);
    return () => window.clearTimeout(timer);
    // persist reads latest state via closure of this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, excerpt, body, topic, coverImage, tags, allowComments, accessMode, exclusiveDays]);

  async function onDraft() {
    await persist("draft", false);
  }

  async function onPublish() {
    await persist("published", false);
  }

  async function onDelete() {
    if (!postId) return;
    setPending("delete");
    try {
      await deletePost({ data: postId });
      toast.success("已移入回收站");
      const { getWorkspaceAccess } = await import("@/lib/entrance/server");
      const { homeForRole } = await import("@/lib/workspace");
      const access = await getWorkspaceAccess().catch(() => null);
      await navigate({ to: homeForRole(access?.role), search: { section: "posts" } });
    } catch {
      toast.error("无法删除");
    } finally {
      setPending(null);
    }
  }

  const slug = post?.slug ?? "_draft";
  const liveWiki = useMemo(
    () => buildWikiGraph(slug, body, catalog, { [slug]: body }),
    [body, catalog, slug],
  );

  function insertWiki(inner: string) {
    const token = `[[${inner}]]`;
    setBody((current) => (current.trim() ? `${current.trimEnd()} ${token}` : token));
    setWikiQuery("");
  }

  async function onRestore(rev: PostRevision) {
    if (!post) return;
    try {
      await restoreRevision({ data: { postId: post.id, revisionId: rev.id } });
      setTitle(rev.title);
      setExcerpt(rev.excerpt);
      setBody(rev.body);
      toast.success("已恢复该版本");
      const next = await listRevisions({ data: post.id }).catch(() => []);
      setRevisions(next);
    } catch {
      toast.error("无法恢复版本");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-console-sidebar">
      <div className="flex shrink-0 items-center gap-3 border-b border-console-line px-4 py-2.5 sm:px-6">
        <Link to="/console" search={{ section: "posts" }} className="text-sm text-console-nav hover:text-console-ink">
          返回文章
        </Link>
        <span className="text-xs text-console-muted">
          {saveState === "saving"
            ? "正在保存…"
            : saveState === "saved"
              ? "已自动保存"
              : saveState === "error"
                ? "刚才没存上"
                : "改完会自动保存"}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          {(["visual", "source", "preview"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={
                mode === item
                  ? "h-8 rounded-md bg-console-active px-2.5 text-xs font-medium text-console-ink"
                  : "h-8 rounded-md px-2.5 text-xs text-console-nav hover:bg-console-active hover:text-console-ink"
              }
            >
              {item === "visual" ? "可视化" : item === "source" ? "源码" : "预览"}
            </button>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            文章设置
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void onDraft()} disabled={!!pending}>
            {pending === "draft" ? "保存中…" : liveStatus === "published" ? "转草稿" : "草稿"}
          </Button>
          <Button type="button" size="sm" onClick={() => void onPublish()} disabled={!!pending}>
            {pending === "published" ? "发布中…" : liveStatus === "published" ? "更新发布" : "发布"}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[46rem] px-6 pb-40 pt-10 sm:px-8">
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="标题"
            className="w-full bg-transparent text-4xl font-semibold leading-tight tracking-tight text-console-ink outline-none placeholder:text-console-muted"
          />
          <input
            id="excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            maxLength={180}
            placeholder="导语"
            className="mt-3 w-full bg-transparent text-base leading-relaxed text-console-nav outline-none placeholder:text-console-muted"
          />
          <div className="mt-8">
            {mode === "visual" ? (
              <VisualEditor
                value={body}
                onChange={setBody}
                onRequestImage={() => setPicker("body")}
                catalog={catalog}
                fill
              />
            ) : null}
            {mode === "source" ? (
              <Textarea
                className="min-h-[calc(100dvh-10rem)] resize-none border-0 bg-transparent p-0 text-base leading-relaxed shadow-none focus-visible:ring-0"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="开始写正文"
              />
            ) : null}
            {mode === "preview" ? (
              <div className="min-h-[calc(100dvh-10rem)]">
                {body.trim() ? (
                  <ArticleBody source={body} catalog={catalog} />
                ) : (
                  <p className="py-10 text-sm text-console-muted">还没有正文。</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-console-sidebar sm:max-w-md">
          <SheetHeader>
            <SheetTitle>文章设置</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label>分类</Label>
              <Select value={topic || undefined} onValueChange={setTopic}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>封面</Label>
              <div className="flex gap-2">
                <Select value={coverImage ?? COVERS[0].value} onValueChange={setCoverImage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {coverImage && !COVERS.some((cover) => cover.value === coverImage) ? (
                      <SelectItem value={coverImage}>已上传封面</SelectItem>
                    ) : null}
                    {COVERS.map((cover) => (
                      <SelectItem key={cover.value} value={cover.value}>
                        {cover.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => setPicker("cover")}>
                  附件
                </Button>
                <label className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border px-3 text-sm">
                  上传
                  <input
                    type="file"
                    accept="image/gif,image/jpeg,image/png,image/webp,.gif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        void uploadAttachment({
                          data: {
                            filename: file.name || "cover.gif",
                            mimeType: file.type || undefined,
                            dataBase64: String(reader.result ?? ""),
                            alt: title || file.name.replace(/\.[^.]+$/, ""),
                            groupName: "封面",
                          },
                        })
                          .then((item) => {
                            setCoverImage(item.url);
                            toast.success("封面已更新");
                          })
                          .catch((error: unknown) => {
                            toast.error(error instanceof Error ? error.message : "封面上传失败");
                          });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              {coverImage ? (
                <img src={coverImage} alt="" className="folio-photo mt-2 aspect-16/10 w-full rounded-lg object-cover" />
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">标签</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="标签，逗号分开"
              />
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(event) => setAllowComments(event.target.checked)}
                className="size-4 accent-primary"
              />
              允许评论
            </label>
            <div className="space-y-2">
              <Label>阅读权限</Label>
              <Select value={accessMode} onValueChange={(value) => setAccessMode(value as AccessMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {ACCESS_LABEL[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {accessMode === "public"
                  ? "所有人立刻可读。"
                  : accessMode === "early"
                    ? "会员立刻可读、不限次数；到期后自动公开。"
                    : "仅有效会员可读，不会自动公开。"}
              </p>
            </div>
            {accessMode === "early" ? (
              <div className="space-y-2">
                <Label htmlFor="exclusive-days">开放时限</Label>
                <div className="flex flex-wrap gap-2">
                  {EXCLUSIVE_DAY_OPTIONS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setExclusiveDays(String(days))}
                      className={
                        exclusiveDays === String(days)
                          ? "inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
                          : "inline-flex h-9 items-center rounded-md bg-secondary px-3 text-xs text-muted-foreground hover:text-foreground"
                      }
                    >
                      {days} 天
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="exclusive-days"
                    type="number"
                    min={1}
                    max={365}
                    inputMode="numeric"
                    value={exclusiveDays}
                    onChange={(event) => setExclusiveDays(event.target.value)}
                    placeholder="天数"
                    className="max-w-28"
                  />
                  <span className="text-sm text-muted-foreground">天后公开</span>
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="wiki-search">双链</Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                正文里输入 <span className="font-mono">[[</span> 搜索文章，和 Obsidian 一样。也可以在这里找。
              </p>
              <Input
                id="wiki-search"
                value={wikiQuery}
                onChange={(event) => setWikiQuery(event.target.value)}
                placeholder="搜索文章"
              />
              {wikiQuery.trim() ? (
                <WikiSuggestMenu
                  query={wikiQuery}
                  catalog={catalog}
                  exclude={post?.slug}
                  onPick={(hit) => insertWiki(hit.inner)}
                  onClose={() => setWikiQuery("")}
                />
              ) : null}
              {liveWiki.outgoing.length ? (
                <p className="text-xs text-muted-foreground">
                  出链 {liveWiki.outgoing.length} 篇
                  {liveWiki.unresolved.length ? ` · 未对应 ${liveWiki.unresolved.join("、")}` : ""}
                </p>
              ) : liveWiki.unresolved.length ? (
                <p className="text-xs text-muted-foreground">未对应：{liveWiki.unresolved.join("、")}</p>
              ) : null}
              {liveWiki.suggested.length ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  正文提到但尚未做成双链：{liveWiki.suggested.map((item) => item.title).join("、")}
                </p>
              ) : null}
              {post?.wiki.backlinks.length ? (
                <p className="text-xs leading-relaxed text-muted-foreground">{post.wiki.backlinks.length} 篇已链到这里</p>
              ) : null}
            </div>
            {post && revisions.length ? (
              <div className="space-y-2">
                <Label>历史版本</Label>
                <ul className="max-h-56 space-y-2 overflow-y-auto rounded-lg bg-card p-3 shadow-md">
                  {revisions.map((rev) => (
                    <li key={rev.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        {rev.editorName} · {formatZhDate(rev.createdAt)}
                      </span>
                      <button type="button" className="shrink-0 text-xs text-primary" onClick={() => void onRestore(rev)}>
                        恢复
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {postId ? (
              <Button variant="ghost" className="text-destructive" onClick={() => void onDelete()} disabled={!!pending}>
                移入回收站
              </Button>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <MediaPicker
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) setPicker(null);
        }}
        onSelect={(item) => {
          if (picker === "cover") {
            setCoverImage(item.url);
          } else {
            setBody((current) => `${current.trim()}\n\n![${item.alt || item.filename}](${item.url})\n\n`);
          }
        }}
      />
    </div>
  );
}
