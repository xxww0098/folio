import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  THEME_IDS,
  parseThemeId,
  parseThemeMode,
  themeById,
  type ThemeId,
  type ThemeMode,
} from "./catalog";
import { DEFAULT_LAYOUT, LAYOUT_IDS, parseLayoutId, type LayoutId } from "./layout";

export const SKIN_KEY = "folio-skin";
export const MODE_KEY = "folio-mode";
export const LAYOUT_KEY = "folio-layout";
const LEGACY_MODE_KEY = "folio-theme";

export function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  return prefersDark() ? "dark" : "light";
}

export function readPrefs(): { skin: ThemeId; mode: ThemeMode; layout: LayoutId } {
  const skin = parseThemeId(window.localStorage.getItem(SKIN_KEY));
  const layout = parseLayoutId(window.localStorage.getItem(LAYOUT_KEY));
  const storedMode = window.localStorage.getItem(MODE_KEY);
  if (storedMode) return { skin, mode: parseThemeMode(storedMode), layout };
  const legacy = window.localStorage.getItem(LEGACY_MODE_KEY);
  if (legacy === "dark" || legacy === "light") return { skin, mode: legacy, layout };
  return { skin, mode: DEFAULT_MODE, layout };
}

export function persistPrefs(skin: ThemeId, mode: ThemeMode, layout: LayoutId) {
  window.localStorage.setItem(SKIN_KEY, skin);
  window.localStorage.setItem(MODE_KEY, mode);
  window.localStorage.setItem(LAYOUT_KEY, layout);
}

export function applyDocument(skin: ThemeId, mode: ThemeMode, layout: LayoutId = DEFAULT_LAYOUT): "light" | "dark" {
  const resolved = resolveMode(mode);
  const root = document.documentElement;
  root.setAttribute("data-theme", skin);
  root.setAttribute("data-layout", layout);
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  const swatch = themeById(skin).swatches[resolved];
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", swatch.header);
  return resolved;
}

export const THEME_BOOT = `(function(){try{var ids=${JSON.stringify(THEME_IDS)};var s=localStorage.getItem(${JSON.stringify(SKIN_KEY)})||${JSON.stringify(DEFAULT_THEME)};if(ids.indexOf(s)<0)s=${JSON.stringify(DEFAULT_THEME)};var m=localStorage.getItem(${JSON.stringify(MODE_KEY)});if(!m){var l=localStorage.getItem(${JSON.stringify(LEGACY_MODE_KEY)});m=l==="dark"||l==="light"?l:${JSON.stringify(DEFAULT_MODE)}}var dark=m==="dark"||(m!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var lids=${JSON.stringify(LAYOUT_IDS)};var ly=localStorage.getItem(${JSON.stringify(LAYOUT_KEY)})||${JSON.stringify(DEFAULT_LAYOUT)};if(lids.indexOf(ly)<0)ly=${JSON.stringify(DEFAULT_LAYOUT)};var r=document.documentElement;r.setAttribute("data-theme",s);r.setAttribute("data-layout",ly);r.classList.toggle("dark",dark);r.style.colorScheme=dark?"dark":"light"}catch(e){}})();`;
