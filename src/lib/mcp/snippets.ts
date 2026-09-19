export function mcpEndpoint(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/mcp`;
}

export function cursorConfig(origin: string, token = "folio_你的令牌") {
  return JSON.stringify(
    {
      mcpServers: {
        folio: {
          url: mcpEndpoint(origin),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    },
    null,
    2,
  );
}

export function vscodeConfig(origin: string, token = "folio_你的令牌") {
  return JSON.stringify(
    {
      servers: {
        folio: {
          type: "http",
          url: mcpEndpoint(origin),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    },
    null,
    2,
  );
}

export function claudeCli(origin: string, token = "folio_你的令牌") {
  return `claude mcp add --transport http folio ${mcpEndpoint(origin)} --header "Authorization: Bearer ${token}"`;
}

export function stdioBridge(origin: string, token = "folio_你的令牌") {
  return JSON.stringify(
    {
      mcpServers: {
        folio: {
          command: "npx",
          args: ["-y", "mcp-remote", mcpEndpoint(origin), "--header", `Authorization: Bearer ${token}`],
        },
      },
    },
    null,
    2,
  );
}

export const SAMPLE_MARKDOWN = `---
title: 从 Agent 推送的判别联合
slug: ts-unions-from-agent
topic: TypeScript
tags:
  - TypeScript
  - 类型系统
status: draft
access: public
---

正文从这里开始。代码围栏写清语言和文件名：

\`\`\`ts:src/lib/parse.ts {3}
export type Result = { ok: true; value: string } | { ok: false; error: string };

export function parse(raw: string): Result {
  if (!raw.trim()) return { ok: false, error: "empty" };
  return { ok: true, value: raw.trim() };
}
\`\`\`
`;
