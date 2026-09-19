export type AutoUpdateState = {
  enabled: boolean;
  lastCheckAt: string | null;
  lastTag: string | null;
};

export const DEFAULT_AUTO_UPDATE: AutoUpdateState = {
  enabled: false,
  lastCheckAt: null,
  lastTag: null,
};

export function parseAutoUpdate(raw: string | null | undefined): AutoUpdateState {
  if (raw === "true" || raw === "1") return { ...DEFAULT_AUTO_UPDATE, enabled: true };
  if (raw === "false" || raw === "0" || !raw) return { ...DEFAULT_AUTO_UPDATE };
  try {
    const data = JSON.parse(raw) as Partial<AutoUpdateState> | boolean;
    if (typeof data === "boolean") return { ...DEFAULT_AUTO_UPDATE, enabled: data };
    return {
      enabled: Boolean(data.enabled),
      lastCheckAt: typeof data.lastCheckAt === "string" ? data.lastCheckAt : null,
      lastTag: typeof data.lastTag === "string" ? data.lastTag : null,
    };
  } catch {
    return { ...DEFAULT_AUTO_UPDATE };
  }
}
