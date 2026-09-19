import { Check, LayoutGrid, List, Monitor, Moon, Newspaper, Palette, Rows3, Sun } from "lucide-react";
import { THEMES, THEME_MODES, MODE_LABEL, type ThemeMode } from "@/lib/theme/catalog";
import { LAYOUTS, type LayoutId } from "@/lib/theme/layout";
import { useTheme } from "@/lib/theme/provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const MODE_ICON: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LAYOUT_ICON: Record<LayoutId, typeof Rows3> = {
  stack: Rows3,
  grid: LayoutGrid,
  magazine: Newspaper,
  stream: List,
};

export function ThemeToggle() {
  const { skin, mode, layout, setSkin, setMode, setLayout } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="主题与外观"
          className="text-header-foreground/80 hover:bg-header-foreground/10 hover:text-header-foreground"
        >
          <Palette className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-1.5rem)] p-1.5">
        <DropdownMenuLabel>外观</DropdownMenuLabel>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(value) => {
            if (value) setMode(value as ThemeMode);
          }}
          variant="outline"
          size="sm"
          className="mb-1 grid w-full grid-cols-3 gap-1 px-1"
        >
          {THEME_MODES.map((item) => {
            const Icon = MODE_ICON[item];
            return (
              <ToggleGroupItem key={item} value={item} className="h-9 gap-1">
                <Icon className="size-3.5" />
                {MODE_LABEL[item]}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>布局</DropdownMenuLabel>
        <ToggleGroup
          type="single"
          value={layout}
          onValueChange={(value) => {
            if (value) setLayout(value as LayoutId);
          }}
          variant="outline"
          size="sm"
          className="mb-1 grid w-full grid-cols-2 gap-1 px-1 pb-1"
        >
          {LAYOUTS.map((item) => {
            const Icon = LAYOUT_ICON[item.id];
            return (
              <ToggleGroupItem
                key={item.id}
                value={item.id}
                className="h-14 flex-col items-start justify-center gap-0.5 px-2.5"
              >
                <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                  <Icon className="size-3.5" />
                  {item.name}
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">{item.hint}</span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
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
                <span className="block text-sm">{theme.name}</span>
              </span>
              {active ? <Check className="size-4 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
