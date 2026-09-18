import { Check, Monitor, Moon, Sun } from "lucide-react";
import { THEMES, THEME_MODES, MODE_LABEL, type ThemeDef, type ThemeMode } from "@/lib/theme/catalog";
import { useTheme } from "@/lib/theme/provider";
import { cn } from "@/lib/utils";

const MODE_ICON: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

function ThemeMock({ theme, mode }: { theme: ThemeDef; mode: "light" | "dark" }) {
  const swatch = theme.swatches[mode];
  return (
    <div className="overflow-hidden" style={{ background: swatch.background }}>
      <div
        className="flex h-8 items-center gap-1.5 px-2.5"
        style={{ background: swatch.header, color: swatch.headerForeground }}
      >
        <span className="size-2 rounded-full" style={{ background: swatch.primary }} />
        <span className="text-xs font-medium tracking-tight">折页</span>
      </div>
      <div className="grid grid-cols-[1.5fr_1fr] gap-1.5 p-2.5">
        <div className="h-11 rounded-sm shadow-sm" style={{ background: swatch.card }} />
        <div className="h-11 rounded-sm shadow-sm" style={{ background: swatch.card }} />
      </div>
    </div>
  );
}

export function ThemeGallery({ compact = false }: { compact?: boolean }) {
  const { skin, mode, resolved, setSkin, setMode } = useTheme();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {THEME_MODES.map((item) => {
          const Icon = MODE_ICON[item];
          const active = mode === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm transition-colors duration-150",
                active ? "bg-primary text-primary-foreground" : "bg-card text-foreground shadow-md hover:bg-secondary",
              )}
            >
              <Icon className="size-4" />
              {MODE_LABEL[item]}
            </button>
          );
        })}
        <span className="text-xs text-muted-foreground">当前 {resolved === "dark" ? "深色" : "浅色"}</span>
      </div>

      <div className={cn("mt-6 grid gap-4", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
        {THEMES.map((theme) => {
          const active = skin === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setSkin(theme.id)}
              className={cn(
                "overflow-hidden rounded-xl bg-card text-left shadow-md ring-1 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg",
                active ? "ring-primary" : "ring-transparent hover:ring-foreground/10",
              )}
            >
              <ThemeMock theme={theme} mode={resolved} />
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold tracking-tight">{theme.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">{theme.tagline}</p>
                  {compact ? null : (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{theme.description}</p>
                  )}
                </div>
                {active ? (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-4" />
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
