export const THEME_IDS = ["earth", "nord", "ink", "terminal", "paper", "mist"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const DEFAULT_THEME: ThemeId = "earth";
export const DEFAULT_MODE: ThemeMode = "system";

export type ThemeSwatch = {
  background: string;
  header: string;
  headerForeground: string;
  primary: string;
  card: string;
};

export type ThemeDef = {
  id: ThemeId;
  name: string;
  tagline: string;
  description: string;
  display: string;
  radius: string;
  swatches: { light: ThemeSwatch; dark: ThemeSwatch };
};

export const THEMES: ThemeDef[] = [
  {
    id: "earth",
    name: "地球",
    tagline: "天青",
    description: "深色顶栏、天青强调、横向卡片。折页默认皮肤。",
    display: "Inter",
    radius: "12px",
    swatches: {
      light: {
        background: "#f8fafc",
        header: "#0f172a",
        headerForeground: "#f8fafc",
        primary: "#0284c7",
        card: "#ffffff",
      },
      dark: {
        background: "#0f172a",
        header: "#020617",
        headerForeground: "#f8fafc",
        primary: "#38bdf8",
        card: "#1e293b",
      },
    },
  },
  {
    id: "nord",
    name: "极夜",
    tagline: "霜蓝",
    description: "北极夜背景与霜蓝强调。给长时间对着代码的人用的冷色皮肤。",
    display: "Inter",
    radius: "10px",
    swatches: {
      light: {
        background: "#eceff4",
        header: "#2e3440",
        headerForeground: "#eceff4",
        primary: "#5e81ac",
        card: "#ffffff",
      },
      dark: {
        background: "#2e3440",
        header: "#242933",
        headerForeground: "#eceff4",
        primary: "#88c0d0",
        card: "#3b4252",
      },
    },
  },
  {
    id: "ink",
    name: "墨迹",
    tagline: "技术期刊",
    description: "暖纸色、衬线标题、朱砂强调。像一本印出来的程序设计杂志。",
    display: "Source Serif 4",
    radius: "4px",
    swatches: {
      light: {
        background: "#f3eee4",
        header: "#1c1917",
        headerForeground: "#faf6ef",
        primary: "#9f2d00",
        card: "#faf6ef",
      },
      dark: {
        background: "#1c1917",
        header: "#0c0a09",
        headerForeground: "#f5f0e6",
        primary: "#e07856",
        card: "#292524",
      },
    },
  },
  {
    id: "terminal",
    name: "终端",
    tagline: "磷光绿",
    description: "近黑底、等宽标题、磷光绿。终端模拟器长成的博客。",
    display: "JetBrains Mono",
    radius: "2px",
    swatches: {
      light: {
        background: "#f3f0e4",
        header: "#142015",
        headerForeground: "#d9f99d",
        primary: "#15803d",
        card: "#fbf8ec",
      },
      dark: {
        background: "#0b100c",
        header: "#060a07",
        headerForeground: "#d9f99d",
        primary: "#4ade80",
        card: "#121a14",
      },
    },
  },
  {
    id: "paper",
    name: "稿纸",
    tagline: "松绿",
    description: "米色稿纸、松绿强调、更圆的卡片。适合长文阅读。",
    display: "Source Serif 4",
    radius: "16px",
    swatches: {
      light: {
        background: "#f7f3ea",
        header: "#2c3e32",
        headerForeground: "#f4f7f3",
        primary: "#3f6b4f",
        card: "#fffdf8",
      },
      dark: {
        background: "#1a211c",
        header: "#121714",
        headerForeground: "#e8efe6",
        primary: "#86b892",
        card: "#242c26",
      },
    },
  },
  {
    id: "mist",
    name: "雾面",
    tagline: "极简文档",
    description: "浅色顶栏、近无彩度。像一份工程文档站，而不是杂志。",
    display: "Inter",
    radius: "8px",
    swatches: {
      light: {
        background: "#f4f4f5",
        header: "#ffffff",
        headerForeground: "#18181b",
        primary: "#18181b",
        card: "#ffffff",
      },
      dark: {
        background: "#09090b",
        header: "#09090b",
        headerForeground: "#fafafa",
        primary: "#e4e4e7",
        card: "#18181b",
      },
    },
  },
];

export const MODE_LABEL: Record<ThemeMode, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && (THEME_IDS as readonly string[]).includes(value);
}

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return !!value && (THEME_MODES as readonly string[]).includes(value);
}

export function parseThemeId(value: string | null | undefined): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

export function parseThemeMode(value: string | null | undefined): ThemeMode {
  return isThemeMode(value) ? value : DEFAULT_MODE;
}

export function themeById(id: ThemeId): ThemeDef {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
