import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { THEMES, THEME_MODES, MODE_LABEL, type ThemeMode } from "@/lib/theme/catalog";
import { useTheme } from "@/lib/theme/provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MODE_ICON: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function ThemeToggle() {
  const { skin, mode, setSkin, setMode } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-md text-header-foreground/80 transition-colors duration-150 hover:bg-header-foreground/10 hover:text-header-foreground"
          aria-label="主题与外观"
        >
          <Palette className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5">
        <DropdownMenuLabel>外观</DropdownMenuLabel>
        <div className="mb-1 grid grid-cols-3 gap-1 px-1">
          {THEME_MODES.map((item) => {
            const Icon = MODE_ICON[item];
            const active = mode === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-1 rounded-md text-xs transition-colors duration-150",
                  active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/70",
                )}
              >
                <Icon className="size-3.5" />
                {MODE_LABEL[item]}
              </button>
            );
          })}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>皮肤</DropdownMenuLabel>
        {THEMES.map((theme) => {
          const active = skin === theme.id;
          const dots = [theme.swatches.light.background, theme.swatches.light.header, theme.swatches.light.primary];
          return (
            <DropdownMenuItem
              key={theme.id}
              onSelect={() => setSkin(theme.id)}
              className="justify-between"
            >
              <span className="flex items-center gap-2">
                <span className="flex -space-x-1" aria-hidden>
                  {dots.map((color) => (
                    <span
                      key={color}
                      className="size-3 rounded-full ring-1 ring-border"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span>
                  <span className="block text-sm">{theme.name}</span>
                  <span className="block text-xs text-muted-foreground">{theme.tagline}</span>
                </span>
              </span>
              {active ? <Check className="size-4 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/themes" className="text-muted-foreground">
            浏览全部主题
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
