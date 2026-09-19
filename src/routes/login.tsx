import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { SignInGate } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteShell } from "@/components/site-shell";
import { FolioMark } from "@/components/folio-mark";
import { listPublishedPosts } from "@/lib/blog/server";
import { getWorkspaceAccess } from "@/lib/entrance/server";
import { getFrontPages } from "@/lib/pages/server";
import { claimAccount, type Role } from "@/lib/roles";
import { homeForRole, canWriteRole } from "@/lib/workspace";

function safeNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

function continuePath(next: string, role: Role | null | undefined, registering: boolean) {
  if ((next.startsWith("/console") || next.startsWith("/write")) && !canWriteRole(role)) return "/me";
  if (next && next !== "/") return next;
  if (registering) return "/me";
  return homeForRole(role);
}

function onGrokHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".grok-sandbox.com") || host.endsWith(".grok.me");
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { next?: string; mode?: "register" } => {
    const next = safeNext(search.next);
    const mode = search.mode === "register" ? "register" : undefined;
    return { ...(next ? { next } : {}), ...(mode ? { mode } : {}) };
  },
  loader: async () => {
    const [posts, access, pages] = await Promise.all([listPublishedPosts(), getWorkspaceAccess(), getFrontPages()]);
    return { posts, access, pages };
  },
  head: () => ({ meta: [{ title: "登录 - 折页" }] }),
  component: Login,
});

function Login() {
  const { posts, access, pages } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const next = search.next ?? "/";
  const mode = search.mode === "register" ? "register" : "login";
  const registering = mode === "register";
  const signedInHome = continuePath(next, access.role, registering);

  return (
    <SiteShell posts={posts} pages={pages}>
      <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-16">
        <Card className="w-full shadow-md">
          <CardHeader>
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FolioMark className="size-4" />
              </span>
              <span className="font-semibold">折页</span>
            </div>
            <h1 className="font-sans text-2xl font-medium leading-tight">{registering ? "注册" : "登录"}</h1>
            <CardDescription>
              {registering ? "注册后可评论、开通会员阅读付费文章。" : "欢迎回来。没有账号就先注册。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInGate
              fallback={
                <SignInOptions
                  callbackURL={next}
                  mode={mode}
                  onMode={(nextMode) =>
                    void navigate({
                      search: {
                        ...(search.next ? { next: search.next } : {}),
                        ...(nextMode === "register" ? { mode: "register" as const } : {}),
                      },
                    })
                  }
                />
              }
            >
              <p className="text-sm text-muted-foreground">你已经登录。</p>
              <Button asChild className="mt-4 w-full">
                <a href={signedInHome}>继续</a>
              </Button>
            </SignInGate>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  );
}

function SignInOptions({
  callbackURL,
  mode,
  onMode,
}: {
  callbackURL: string;
  mode: "login" | "register";
  onMode: (mode: "login" | "register") => void;
}) {
  if (!authEnabled) {
    return <p className="text-sm text-muted-foreground">登录暂未开放。</p>;
  }
  const showOAuth = onGrokHost() || !emailAndPasswordEnabled;
  return (
    <div className="flex flex-col gap-6">
      {emailAndPasswordEnabled ? (
        <div className="space-y-4">
          <Tabs value={mode} onValueChange={(value) => onMode(value === "register" ? "register" : "login")}>
            <TabsList className="flex w-full">
              <TabsTrigger className="flex-1" value="login">
                登录
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="register">
                注册
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <EmailPasswordForm callbackURL={callbackURL} mode={mode} />
        </div>
      ) : null}
      {showOAuth ? (
        <div className="flex flex-col gap-2">
          {emailAndPasswordEnabled ? (
            <p className="text-center text-xs text-muted-foreground">或使用其他方式</p>
          ) : null}
          {GROK_PROVIDERS.map((provider) => (
            <Button
              key={provider.providerId}
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => signIn(provider.providerId, { callbackURL })}
            >
              使用 {provider.label} 继续
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function friendlyAuthError(message: string | undefined, mode: "login" | "register") {
  const text = (message ?? "").toLowerCase();
  if (text.includes("already") || text.includes("exists") || text.includes("unique")) {
    return "这个邮箱已经注册过";
  }
  if (text.includes("password") && (text.includes("short") || text.includes("least") || text.includes("length"))) {
    return "密码至少 8 位";
  }
  if (text.includes("invalid") || text.includes("credential") || text.includes("incorrect") || text.includes("wrong")) {
    return mode === "register" ? "无法注册，请检查邮箱和密码" : "邮箱或密码不对";
  }
  if (message) return message;
  return mode === "register" ? "无法注册" : "邮箱或密码不对";
}

function EmailPasswordForm({ callbackURL, mode }: { callbackURL: string; mode: "login" | "register" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const registering = mode === "register";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (registering) {
      if (!trimmedName) {
        toast.error("请填写显示名");
        return;
      }
      if (password !== confirm) {
        toast.error("两次输入的密码不一致");
        return;
      }
    }
    setBusy(true);
    try {
      if (registering) {
        const { error } = await authClient.signUp.email({
          email: trimmedEmail,
          password,
          name: trimmedName,
        });
        if (error) throw new Error(friendlyAuthError(error.message, "register"));
      } else {
        const { error } = await authClient.signIn.email({
          email: trimmedEmail,
          password,
        });
        if (error) throw new Error(friendlyAuthError(error.message, "login"));
      }
      const claimed = await claimAccount().catch(() => undefined);
      window.location.href = continuePath(callbackURL, claimed?.role ?? null, registering);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : registering ? "无法注册" : "无法登录");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
      {registering ? (
        <div>
          <Label htmlFor="folio-name">显示名</Label>
          <Input
            id="folio-name"
            className="mt-2"
            type="text"
            required
            minLength={1}
            maxLength={32}
            value={name}
            autoComplete="nickname"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
      ) : null}
      <div>
        <Label htmlFor="folio-email">邮箱</Label>
        <Input
          id="folio-email"
          className="mt-2"
          type="email"
          required
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="folio-password">密码</Label>
        <Input
          id="folio-password"
          className="mt-2"
          type="password"
          required
          minLength={8}
          value={password}
          autoComplete={registering ? "new-password" : "current-password"}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {registering ? (
        <div>
          <Label htmlFor="folio-confirm">确认密码</Label>
          <Input
            id="folio-confirm"
            className="mt-2"
            type="password"
            required
            minLength={8}
            value={confirm}
            autoComplete="new-password"
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>
      ) : null}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "请稍候…" : registering ? "注册" : "登录"}
      </Button>
    </form>
  );
}
