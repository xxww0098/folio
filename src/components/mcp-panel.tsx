import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { createObsidianToken } from "@/lib/obsidian/server";
import { MCP_TOOLS } from "@/lib/mcp/catalog";
import { claudeCli, cursorConfig, mcpEndpoint, SAMPLE_MARKDOWN, stdioBridge, vscodeConfig } from "@/lib/mcp/snippets";

function randomTokenName() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return `agent-${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function McpPanel({ showTokens = true }: { showTokens?: boolean }) {
  const { user, isPending } = useCurrentUserState();
  const [origin, setOrigin] = useState("");
  const [tokenName, setTokenName] = useState("Agent");
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [probe, setProbe] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const token = freshToken || "folio_你的令牌";
  const endpoint = origin ? mcpEndpoint(origin) : "/api/mcp";
  const cursor = useMemo(() => (origin ? cursorConfig(origin, token) : ""), [origin, token]);
  const vscode = useMemo(() => (origin ? vscodeConfig(origin, token) : ""), [origin, token]);
  const cli = useMemo(() => (origin ? claudeCli(origin, token) : ""), [origin, token]);
  const stdio = useMemo(() => (origin ? stdioBridge(origin, token) : ""), [origin, token]);

  async function onCreateToken() {
    setBusy("token");
    try {
      const result = await createObsidianToken({ data: { name: tokenName.trim() || "Agent" } });
      setFreshToken(result.token);
      toast.success("令牌已签发，请立即复制");
    } catch {
      toast.error("无法签发令牌，请先登录");
    } finally {
      setBusy(null);
    }
  }

  async function onProbe() {
    if (!freshToken) {
      toast.error("请先签发令牌");
      return;
    }
    setBusy("probe");
    setProbe(null);
    try {
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${freshToken}`,
        "MCP-Protocol-Version": "2026-07-28",
        "Mcp-Method": "server/discover",
        "Mcp-Name": "server",
      };
      const init = await fetch("/api/mcp", {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "server/discover",
          params: {
            _meta: {
              "io.modelcontextprotocol/protocolVersion": "2026-07-28",
              "io.modelcontextprotocol/clientInfo": { name: "folio-web", version: "1.0.0" },
              "io.modelcontextprotocol/clientCapabilities": {},
            },
          },
        }),
      });
      const initBody = (await init.json()) as {
        result?: { _meta?: { "io.modelcontextprotocol/serverInfo"?: { name?: string } }; supportedVersions?: string[] };
        error?: { message?: string };
      };
      if (!init.ok || initBody.error) {
        throw new Error(initBody.error?.message || `发现失败（${init.status}）`);
      }
      const listed = await fetch("/api/mcp", {
        method: "POST",
        headers: { ...headers, "Mcp-Method": "tools/call", "Mcp-Name": "whoami" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "whoami",
            arguments: {},
            _meta: {
              "io.modelcontextprotocol/protocolVersion": "2026-07-28",
              "io.modelcontextprotocol/clientInfo": { name: "folio-web", version: "1.0.0" },
            },
          },
        }),
      });
      const listedBody = (await listed.json()) as { result?: { content?: Array<{ text?: string }>; isError?: boolean } };
      const text = listedBody.result?.content?.[0]?.text ?? "";
      setProbe(text || JSON.stringify(listedBody, null, 2));
      toast.success(`已连通 ${initBody.result?._meta?.["io.modelcontextprotocol/serverInfo"]?.name ?? "folio"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "探测失败");
    } finally {
      setBusy(null);
    }
  }

  async function copy(value: string, ok = "已复制") {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(ok);
    } catch {
      toast.error("无法写入剪贴板，请手动复制");
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-card p-5 shadow-md">
        <h2 className="text-base font-semibold">端点</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          客户端用 Streamable HTTP 连到这个地址，只认协议 2026-07-28：无会话、无 initialize，先调 server/discover。请求头带个人令牌。和 Obsidian 同步共用同一类{" "}
          <span className="font-mono text-xs">folio_</span> 令牌。
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-secondary/60 px-3 py-2 font-mono text-xs">
            {endpoint}
          </code>
          <Button type="button" size="sm" variant="outline" onClick={() => void copy(endpoint, "已复制端点")}>
            复制
          </Button>
        </div>
      </section>

      {showTokens ? (
        <section className="rounded-xl bg-card p-5 shadow-md">
          <h2 className="text-base font-semibold">个人令牌</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            完整字符串只出现一次。256 位随机密钥，服务端只存 HMAC。猜错几次会暂时锁定。
          </p>
          {!isPending && !user ? (
            <div className="mt-4">
              <Button asChild>
                <Link to="/login" search={{ next: "/console?section=agent" }}>
                  登录后签发
                </Link>
              </Button>
            </div>
          ) : (
            <>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Label htmlFor="mcp-token-name">令牌名称</Label>
              <Input
                id="mcp-token-name"
                className="mt-2"
                value={tokenName}
                maxLength={32}
                onChange={(event) => setTokenName(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTokenName(randomTokenName())}
            >
              随机生成
            </Button>
            <Button type="button" onClick={() => void onCreateToken()} disabled={busy === "token" || isPending}>
              {busy === "token" ? "签发中…" : "签发令牌"}
            </Button>
          </div>
          {freshToken ? (
            <div className="mt-4 rounded-lg border border-border bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground">请立即复制，关闭后无法再看。</p>
              <code className="mt-2 block break-all font-mono text-xs">{freshToken}</code>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void copy(freshToken, "已复制令牌")}>
                  复制令牌
                </Button>
                <Button type="button" size="sm" onClick={() => void onProbe()} disabled={busy === "probe"}>
                  {busy === "probe" ? "探测中…" : "用此令牌探测"}
                </Button>
              </div>
              {probe ? (
                <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-code p-3 font-mono text-xs text-code-fg">{probe}</pre>
              ) : null}
            </div>
          ) : null}
            </>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          登录后到{" "}
          <Link to="/console" search={{ section: "agent" }} className="text-primary hover:underline">
            控制台 · Agent
          </Link>{" "}
          签发令牌。
        </p>
      )}

      {origin ? (
        <section className="space-y-6">
          <Snippet title="Cursor" filename="mcp.json" lang="json" code={cursor} />
          <Snippet title="VS Code" filename=".vscode/mcp.json" lang="json" code={vscode} />
          <Snippet title="命令行客户端" filename="cli.sh" lang="bash" code={cli} />
          <Snippet title="仅支持 stdio 的客户端" filename="mcp.json" lang="json" code={stdio} />
        </section>
      ) : null}

      <section className="rounded-xl bg-card p-5 shadow-md">
        <h2 className="text-base font-semibold">工具</h2>
        <p className="mt-1 text-sm text-muted-foreground">文章、评论、瞬间、友链、图库和前台栏目都可以远程管理。</p>
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
          {MCP_TOOLS.map((tool) => (
            <li key={tool.name} className="px-4 py-3">
              <p className="font-mono text-sm">{tool.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tool.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-card p-5 shadow-md">
        <h2 className="text-base font-semibold">推送格式</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          新稿先调用 <span className="font-mono text-xs">draft_post</span> 存草稿，确认后再{" "}
          <span className="font-mono text-xs">publish_post</span> 发布。同一 slug 再次推送会覆盖并留下版本。
        </p>
        <div className="mt-4">
          <CodeBlock lang="yaml" filename="note.md" highlights={[]} code={SAMPLE_MARKDOWN} />
        </div>
      </section>
    </div>
  );
}

function Snippet({ title, filename, lang, code }: { title: string; filename: string; lang: string; code: string }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <CodeBlock lang={lang} filename={filename} highlights={[]} code={code} />
    </div>
  );
}
