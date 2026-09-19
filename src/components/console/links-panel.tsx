import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  createFriendLink,
  deleteFriendLink,
  listFriendLinks,
  updateFriendLink,
  type FriendLink,
} from "@/lib/links/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Draft = {
  name: string;
  url: string;
  description: string;
  groupName: string;
};

const EMPTY: Draft = { name: "", url: "https://", description: "", groupName: "博客" };

export function LinksPanel() {
  const [links, setLinks] = useState<FriendLink[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<number, Draft>>({});
  const editsRef = useRef<Record<number, Draft>>({});
  const timers = useRef<Record<number, number>>({});

  async function refresh() {
    const next = await listFriendLinks();
    setLinks(next);
    setEdits(Object.fromEntries(next.map((item) => [item.id, toDraft(item)])));
    editsRef.current = Object.fromEntries(next.map((item) => [item.id, toDraft(item)]));
  }

  useEffect(() => {
    void refresh().catch(() => setLinks([]));
    const current = timers.current;
    return () => {
      for (const id of Object.values(current)) window.clearTimeout(id);
    };
  }, []);

  async function onAdd() {
    setBusy("add");
    try {
      await createFriendLink({
        data: {
          name: draft.name.trim(),
          url: draft.url.trim(),
          description: draft.description.trim(),
          groupName: draft.groupName.trim() || "博客",
        },
      });
      setDraft(EMPTY);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法添加");
    } finally {
      setBusy(null);
    }
  }

  function patch(id: number, next: Partial<Draft>) {
    setEdits((current) => {
      const base = current[id] ?? EMPTY;
      const merged = { ...current, [id]: { ...base, ...next } };
      editsRef.current = merged;
      return merged;
    });
    window.clearTimeout(timers.current[id]);
    timers.current[id] = window.setTimeout(() => {
      const row = editsRef.current[id];
      if (!row) return;
      void updateFriendLink({
        data: {
          id,
          name: row.name.trim(),
          url: row.url.trim(),
          description: row.description.trim(),
          groupName: row.groupName.trim() || "博客",
        },
      })
        .then((saved) => {
          setLinks((list) => list.map((item) => (item.id === id ? saved : item)));
          setEdits((current) => {
            const merged = { ...current, [id]: toDraft(saved) };
            editsRef.current = merged;
            return merged;
          });
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "无法保存");
        });
    }, 700);
  }

  async function onDelete(id: number) {
    setBusy(`del-${id}`);
    try {
      await deleteFriendLink({ data: { id } });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法删除");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-console-muted">在这里改友链，前台 /links 会跟着变。改完自动保存。</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="名称">
          <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={40} />
        </Field>
        <Field label="地址">
          <Input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} className="font-mono" />
        </Field>
        <Field label="简介">
          <Input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} maxLength={80} />
        </Field>
        <Field label="分组">
          <Input value={draft.groupName} onChange={(event) => setDraft({ ...draft, groupName: event.target.value })} maxLength={12} />
        </Field>
      </div>
      <Button size="sm" disabled={busy === "add" || !draft.name.trim()} onClick={() => void onAdd()}>
        {busy === "add" ? "添加中…" : "添加友链"}
      </Button>
      {links.length === 0 ? (
        <p className="py-8 text-sm text-console-muted">还没有友链。</p>
      ) : (
        <ul className="divide-y divide-console-line overflow-hidden rounded-xl border border-console-line">
          {links.map((link) => {
            const row = edits[link.id] ?? toDraft(link);
            return (
              <li key={link.id} className="space-y-3 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input value={row.name} onChange={(event) => patch(link.id, { name: event.target.value })} maxLength={40} />
                  <Input
                    value={row.url}
                    onChange={(event) => patch(link.id, { url: event.target.value })}
                    className="font-mono"
                  />
                  <Input
                    value={row.description}
                    onChange={(event) => patch(link.id, { description: event.target.value })}
                    maxLength={80}
                  />
                  <div className="flex gap-2">
                    <Input
                      value={row.groupName}
                      onChange={(event) => patch(link.id, { groupName: event.target.value })}
                      maxLength={12}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      disabled={busy === `del-${link.id}`}
                      onClick={() => void onDelete(link.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function toDraft(link: FriendLink): Draft {
  return { name: link.name, url: link.url, description: link.description, groupName: link.groupName };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-console-muted">{label}</Label>
      {children}
    </div>
  );
}
