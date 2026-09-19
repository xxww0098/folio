import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_MODE, DEFAULT_THEME, type ThemeId, type ThemeMode } from "./catalog";
import { DEFAULT_LAYOUT, type LayoutId } from "./layout";
import { applyDocument, persistPrefs, readPrefs } from "./apply";

type ThemeContextValue = {
  skin: ThemeId;
  mode: ThemeMode;
  layout: LayoutId;
  resolved: "light" | "dark";
  setSkin: (skin: ThemeId) => void;
  setMode: (mode: ThemeMode) => void;
  setLayout: (layout: LayoutId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<ThemeId>(DEFAULT_THEME);
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [layout, setLayoutState] = useState<LayoutId>(DEFAULT_LAYOUT);
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const skinRef = useRef(skin);
  const modeRef = useRef(mode);
  const layoutRef = useRef(layout);
  skinRef.current = skin;
  modeRef.current = mode;
  layoutRef.current = layout;

  useEffect(() => {
    const prefs = readPrefs();
    setSkinState(prefs.skin);
    setModeState(prefs.mode);
    setLayoutState(prefs.layout);
    setResolved(applyDocument(prefs.skin, prefs.mode, prefs.layout));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (modeRef.current !== "system") return;
      setResolved(applyDocument(skinRef.current, "system", layoutRef.current));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      skin,
      mode,
      layout,
      resolved,
      setSkin: (next) => {
        setSkinState(next);
        persistPrefs(next, modeRef.current, layoutRef.current);
        setResolved(applyDocument(next, modeRef.current, layoutRef.current));
      },
      setMode: (next) => {
        setModeState(next);
        persistPrefs(skinRef.current, next, layoutRef.current);
        setResolved(applyDocument(skinRef.current, next, layoutRef.current));
      },
      setLayout: (next) => {
        setLayoutState(next);
        persistPrefs(skinRef.current, modeRef.current, next);
        setResolved(applyDocument(skinRef.current, modeRef.current, next));
      },
    }),
    [skin, mode, layout, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return value;
}
