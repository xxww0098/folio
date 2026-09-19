import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { addTopic, getTopics, removeTopic, renameTopic } from "@/lib/topics/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TopicsPanel() {
  const [topics, setTopics] = useState<string[] | null>(null);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const timers = useRef<Record<string, number>>({});

  useEffect(() => {
    void getTopics()
      .then((list) => {
        setTopics(list);
        setDrafts(list);
      })
      .catch(() => setTopics([]));
    const current = timers.current;
    return () => {
      Object.values(current).forEach((id) => window.clearTimeout(id));
    };
  }, []);

  function onDraft(index: number, value: string) {
    setDrafts((current) => current.map((item, i) => (i === index ? value : item)));
    const from = topics?.[index];
    if (!from) return;
    window.clearTimeout(timers.current[from]);
    timers.current[from] = window.setTimeout(() => {
      void renameTopic({ data: { from, to: value } })
        .then((list) => {
          setTopics(list);
          setDrafts(list);
        })
        .catch((error) => {
          toast.error(error instanceof Error ? error.message : "没能改名");
          if (topics) setDrafts(topics);
        });
    }, 700);
  }

  async function onAdd() {
    setBusy("add");
    try {
      const list = await addTopic({ data: { name } });
      setTopics(list);
      setDrafts(list);
      setName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "没能添加");
    } finally {
      setBusy(null);
    }
  }

  async function onRemove(item: string) {
    setBusy(item);
    try {
      const list = await removeTopic({ data: { name: item } });
      setTopics(list);
      setDrafts(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "没能删除");
    } finally {
      setBusy(null);
    }
  }

  if (!topics) {
    return <p className="text-sm text-console-muted">读取分类…</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-console-muted">改名会同步到已有文章。有文章的分类不能删。</p>
      <ul className="divide-y divide-console-line overflow-hidden rounded-xl bg-console-sidebar">
        {drafts.map((item, index) => (
          <li key={topics[index] ?? item} className="flex items-center gap-2 px-3 py-2">
            <Input
              value={item}
              onChange={(event) => onDraft(index, event.target.value)}
              className="h-10 bg-console-card"
              aria-label="分类名"
            />
            <Button type="button" variant="ghost" size="sm" disabled={busy === topics[index]} onClick={() => void onRemove(topics[index] ?? item)}>
              删除
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="新分类"
          className="bg-console-card"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void onAdd();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={() => void onAdd()} disabled={busy === "add" || !name.trim()}>
          {busy === "add" ? "添加中…" : "添加"}
        </Button>
      </div>
    </div>
  );
}
