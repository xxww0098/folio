export const AUTO_SWEEP_GRACE_MS = 15 * 60 * 1000;
export const MANUAL_SWEEP_GRACE_MS = 30 * 1000;

export type AttachmentRef = {
  id: number;
  url: string;
  objectKey?: string | null;
  stored?: boolean;
  createdAt?: string;
};

export function referencesAttachment(blob: string, item: AttachmentRef): boolean {
  const id = Number(item.id);
  if (!Number.isInteger(id) || id <= 0 || !blob) return false;
  if (new RegExp(`(?:^|[^0-9])/api/files/${id}(?![0-9])`).test(blob)) return true;
  if (new RegExp(`(?:^|/)attachments/${id}/`).test(blob)) return true;
  const key = item.objectKey?.trim();
  if (key && blob.includes(key)) return true;
  const url = item.url?.trim();
  if (url && url.length >= 8 && blob.includes(url)) return true;
  return false;
}

export function unreferencedAttachmentIds(
  items: AttachmentRef[],
  blob: string,
  now = Date.now(),
  graceMs = 0,
): number[] {
  const ids: number[] = [];
  for (const item of items) {
    if (item.stored === false) continue;
    if (referencesAttachment(blob, item)) continue;
    if (graceMs > 0 && item.createdAt) {
      const created = Date.parse(item.createdAt);
      if (Number.isFinite(created) && now - created < graceMs) continue;
    }
    ids.push(item.id);
  }
  return ids;
}

export function orphanObjectKeys(objectKeys: string[], knownKeys: Array<string | null | undefined>): string[] {
  const known = new Set(knownKeys.map((key) => String(key ?? "").trim()).filter(Boolean));
  const orphans: string[] = [];
  for (const key of objectKeys) {
    const trimmed = String(key ?? "").trim();
    if (!trimmed || known.has(trimmed)) continue;
    orphans.push(trimmed);
  }
  return orphans;
}
