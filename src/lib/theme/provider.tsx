import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEFAULT_MODE, DEFAULT_THEME, type ThemeId, type ThemeMode } from "./catalog";
import { applyDocument, persistPrefs, readPrefs } from "./apply";

type ThemeContextValue = {
  skin: ThemeId;
  mode: ThemeMode;
  resolved: "light" | "dark";
  setSkin: (skin: ThemeId) => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<ThemeId>(DEFAULT_THEME);
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const skinRef = useRef(skin);
  const modeRef = useRef(mode);
  skinRef.current = skin;
  modeRef.current = mode;

  useEffect(() => {
    const prefs = readPrefs();
    setSkinState(prefs.skin);
    setModeState(prefs.mode);
    setResolved(applyDocument(prefs.skin, prefs.mode));

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (modeRef.current !== "system") return;
      setResolved(applyDocument(skinRef.current, "system"));
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      skin,
      mode,
      resolved,
      setSkin: (next) => {
        setSkinState(next);
        persistPrefs(next, modeRef.current);
        setResolved(applyDocument(next, modeRef.current));
      },
      setMode: (next) => {
        setModeState(next);
        persistPrefs(skinRef.current, next);
        setResolved(applyDocument(skinRef.current, next));
      },
    }),
    [skin, mode, resolved],
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
