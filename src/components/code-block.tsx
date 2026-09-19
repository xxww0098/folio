import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { highlight, languageInfo, type FenceMeta } from "@/lib/blog/highlight";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TOKEN_CLASS: Record<string, string> = {
  plain: "text-code-fg",
  kw: "text-code-kw",
  type: "text-code-type",
  fn: "text-code-fn",
  str: "text-code-str",
  cmt: "text-code-cmt italic",
  num: "text-code-num",
  op: "text-code-op",
  punct: "text-code-punct",
  prop: "text-code-prop",
  macro: "text-code-fn",
  bool: "text-code-num",
};

export function CodeBlock({ lang, filename, highlights, code }: FenceMeta) {
  const info = languageInfo(lang);
  const lines = useMemo(() => highlight(code, lang, highlights), [code, lang, highlights]);
  const [copied, setCopied] = useState(false);
  const numbered = lines.length > 1;

  function copy() {
    setCopied(true);
    toast.success("已复制代码");
    window.setTimeout(() => setCopied(false), 1800);
    void writeClipboard(code);
  }

  return (
    <figure className="code-block group my-6 -mx-4 overflow-hidden rounded-none bg-code shadow-[inset_0_0_0_1px_rgb(148_163_184/0.12)] sm:mx-0 sm:rounded-lg">
      <figcaption className="flex h-10 items-center gap-2 border-b border-white/5 px-3">
        <span className={cn("size-2 rounded-full", info.id === "text" ? "bg-slate-500" : "bg-current", info.tone)} />
        <span className={cn("text-xs font-medium", info.tone)}>{info.label}</span>
        {filename ? (
          <span className="min-w-0 truncate font-mono text-xs text-code-muted">{filename}</span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void copy()}
          className={cn(
            "ml-auto h-8 gap-1.5 px-2 text-xs hover:bg-white/5",
            copied ? "text-code-str" : "text-code-muted hover:text-code-fg",
          )}
          aria-label={copied ? "已复制" : "复制代码"}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span className="hidden sm:inline">{copied ? "已复制" : "复制"}</span>
        </Button>
      </figcaption>
      <pre className="overflow-x-auto py-3">
        <code className="block font-mono text-xs leading-6 sm:text-sm">
          {lines.map((line, index) => (
            <span
              key={index}
              className={cn(
                "flex min-w-full px-3",
                line.kind === "mark" && "bg-code-highlight",
                line.kind === "add" && "bg-emerald-400/10",
                line.kind === "del" && "bg-rose-400/10",
              )}
            >
              {numbered ? (
                <span className="sticky left-0 hidden w-8 shrink-0 select-none bg-inherit pr-3 text-right text-code-muted tabular-nums sm:inline">
                  {index + 1}
                </span>
              ) : null}
              <span className="flex-1 whitespace-pre">
                {line.tokens.length === 0
                  ? " "
                  : line.tokens.map((token, tokenIndex) => (
                      <span key={tokenIndex} className={TOKEN_CLASS[token.kind] ?? TOKEN_CLASS.plain}>
                        {token.text}
                      </span>
                    ))}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

async function writeClipboard(code: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
      return;
    }
    throw new Error("clipboard unavailable");
  } catch {
    const input = document.createElement("textarea");
    input.value = code;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}
