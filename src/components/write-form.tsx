import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { createPost, deletePost, getWikiCatalog, listRevisions, restoreRevision, updatePost } from "@/lib/blog/server";
import { ArticleBody } from "@/lib/blog/markdown";
import { TOPICS, type PostDetail, type PostRevision, type PostStatus, type Topic } from "@/lib/blog/types";
import { ACCESS_LABEL, ACCESS_MODES, EXCLUSIVE_DAY_OPTIONS, type AccessMode } from "@/lib/membership/access";
import { buildWikiGraph, wikiShortLabel, type WikiCatalogItem } from "@/lib/blog/wikilink";
import { formatZhDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/media-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { VisualEditor } from "@/components/visual-editor";

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
  const [topic, setTopic] = useState<Topic>((TOPICS as readonly string[]).includes(post?.topic ?? "") ? (post?.topic as Topic) : TOPICS[0]);
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? COVERS[0].value);
  const [tags, setTags] = useState((post?.tags ?? []).map((tag) => tag.name).join("，"));
  const [allowComments, setAllowComments] = useState(post?.allowComments !== false);
  const [accessMode, setAccessMode] = useState<AccessMode>(post?.accessMode ?? "public");
  const [exclusiveDays, setExclusiveDays] = useState(String(post?.exclusiveDays ?? 7));
  const [pending, setPending] = useState<"draft" | "published" | "delete" | null>(null);
  const [picker, setPicker] = useState<"cover" | "body" | null>(null);
  const [revisions, setRevisions] = useState<PostRevision[]>([]);
  const [catalog, setCatalog] = useState<WikiCatalogItem[]>(post?.wiki.catalog ?? []);

  useEffect(() => {
    void getWikiCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(post?.wiki.catalog ?? []));
  }, [post?.wiki.catalog]);

  useEffect(() => {
    if (!post) return;
    void listRevisions({ data: post.id })
      .then(setRevisions)
      .catch(() => setRevisions([]));
  }, [post]);

  async function save(status: PostStatus) {
    setPending(status);
    try {
      const payload = {
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
      };
      if (post) {
        const result = await updatePost({ data: { id: post.id, ...payload } });
        toast.success(status === "published" ? "已发布" : "草稿已保存");
        const next = await listRevisions({ data: post.id }).catch(() => []);
        setRevisions(next);
        await navigate({ to: "/posts/$slug", params: { slug: result.slug } });
      } else {
        const result = await createPost({ data: payload });
        toast.success(status === "published" ? "已发布" : "草稿已保存");
        await navigate({ to: "/posts/$slug", params: { slug: result.slug } });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "没能保存";
      toast.error(message === "Unauthorized" ? "请先登录" : message);
    } finally {
      setPending(null);
    }
  }

  async function onDelete() {
    if (!post) return;
    setPending("delete");
    try {
      await deletePost({ data: post.id });
      toast.success("已移入回收站");
      await navigate({ to: "/console" });
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

  function insertWiki(item: WikiCatalogItem) {
    const token = `[[${item.slug}|${wikiShortLabel(item.title)}]]`;
    setBody((current) => (current.trim() ? `${current.trimEnd()} ${token}` : token));
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
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="space-y-5 lg:col-span-7">
        <div className="space-y-2">
          <Label htmlFor="title">标题</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="excerpt">导语</Label>
          <Textarea
            id="excerpt"
            className="min-h-24"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            maxLength={180}
          />
        </div>
        <Tabs defaultValue="visual">
          <TabsList>
            <TabsTrigger value="visual">可视化</TabsTrigger>
            <TabsTrigger value="source">源码</TabsTrigger>
            <TabsTrigger value="preview">预览</TabsTrigger>
          </TabsList>
          <TabsContent value="visual">
            <VisualEditor value={body} onChange={setBody} onRequestImage={() => setPicker("body")} catalog={catalog} />
          </TabsContent>
          <TabsContent value="source">
            <Textarea
              className="min-h-80 text-base leading-relaxed"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="空两行分段。代码块用 ```ts。双链用 [[别名]] 或 [[别名#小节|显示名]]，段落末尾加 ^id 作为块锚点。"
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-80 rounded-lg bg-card px-5 py-2 shadow-[var(--shadow-border)]">
              {body.trim() ? (
                <ArticleBody source={body} catalog={catalog} />
              ) : (
                <p className="py-10 text-sm text-muted-foreground">还没有正文。</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <aside className="space-y-5 lg:col-span-5">
        <div className="space-y-2">
          <Label>分类</Label>
          <Select value={topic} onValueChange={(value) => setTopic(value as Topic)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TOPICS.map((item) => (
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
            placeholder="用逗号分隔，如 TypeScript，类型系统"
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
            <Label>开放时限</Label>
            <Select value={exclusiveDays} onValueChange={setExclusiveDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXCLUSIVE_DAY_OPTIONS.map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    {days} 天后公开
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="flex flex-col gap-3 pt-2">
          <Button onClick={() => void save("published")} disabled={!!pending}>
            {pending === "published" ? "发布中…" : "发布"}
          </Button>
          <Button variant="outline" onClick={() => void save("draft")} disabled={!!pending}>
            {pending === "draft" ? "保存中…" : "存为草稿"}
          </Button>
          {post ? (
            <Button variant="ghost" className="text-destructive" onClick={() => void onDelete()} disabled={!!pending}>
              移入回收站
            </Button>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>双链</Label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            点一篇已发布的文章，插入 <span className="font-mono">[[别名]]</span>。出链会立刻出现在预览里。
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-card p-2 shadow-md">
            {catalog
              .filter((item) => item.slug !== post?.slug)
              .map((item) => (
                <li key={item.slug}>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between rounded-md px-2 text-left text-sm hover:bg-secondary"
                    onClick={() => insertWiki(item)}
                  >
                    <span className="min-w-0 truncate">{item.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.slug}</span>
                  </button>
                </li>
              ))}
          </ul>
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
            <p className="text-xs leading-relaxed text-muted-foreground">
              {post.wiki.backlinks.length} 篇已链到这里
            </p>
          ) : null}
        </div>
        {post && revisions.length ? (
          <div className="space-y-2 pt-2">
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
      </aside>
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
