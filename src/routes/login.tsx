import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { SignInGate } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteShell } from "@/components/site-shell";
import { listPublishedPosts } from "@/lib/blog/server";

function safeNext(value: unknown) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

function onGrokHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".grok-sandbox.com") || host.endsWith(".grok.me");
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { next?: string } => {
    const next = safeNext(search.next);
    return next ? { next } : {};
  },
  loader: () => listPublishedPosts(),
  component: Login,
});

function Login() {
  const posts = Route.useLoaderData();
  const next = Route.useSearch().next ?? "/";
  return (
    <SiteShell posts={posts}>
      <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-16">
        <div className="w-full rounded-xl bg-card p-8 shadow-md">
          <div className="mb-6 flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              折
            </span>
            <span className="font-semibold">折页</span>
          </div>
          <h1 className="text-2xl font-semibold">登录</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            登录后可评论、投稿。
          </p>
          <div className="mt-8">
            <SignInGate fallback={<SignInOptions callbackURL={next} />}>
              <p className="text-sm text-muted-foreground">你已经登录。</p>
              <Button asChild className="mt-4 w-full">
                <a href={next === "/" ? "/membership" : next}>继续</a>
              </Button>
            </SignInGate>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function SignInOptions({ callbackURL }: { callbackURL: string }) {
  if (!authEnabled) {
    return <p className="text-sm text-muted-foreground">登录暂未开放。</p>;
  }
  const showOAuth = onGrokHost() || !emailAndPasswordEnabled;
  return (
    <div className="flex flex-col gap-6">
      {emailAndPasswordEnabled ? <EmailPasswordForm callbackURL={callbackURL} /> : null}
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

function EmailPasswordForm({ callbackURL }: { callbackURL: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await authClient.signUp.email({
          name: name.trim() || email.split("@")[0] || "作者",
          email: email.trim(),
          password,
        });
        if (error) throw new Error(error.message || "无法注册");
      } else {
        const { error } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (error) throw new Error(error.message || "邮箱或密码不对");
      }
      window.location.href = callbackURL;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法登录");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
      {mode === "signup" ? (
        <div>
          <Label htmlFor="folio-name">名称</Label>
          <Input
            id="folio-name"
            className="mt-2"
            value={name}
            maxLength={32}
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
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "请稍候…" : mode === "signup" ? "注册并登录" : "登录"}
      </Button>
      <button
        type="button"
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
      >
        {mode === "signup" ? "已有账号？去登录" : "没有账号？注册"}
      </button>
    </form>
  );
}
