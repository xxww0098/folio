export const LAYOUT_IDS = ["stack", "grid", "magazine", "stream"] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];
export const DEFAULT_LAYOUT: LayoutId = "stack";

export type LayoutDef = {
  id: LayoutId;
  name: string;
  hint: string;
};

export const LAYOUTS: LayoutDef[] = [
  { id: "stack", name: "横卡", hint: "封面在左" },
  { id: "grid", name: "方格", hint: "两列封面" },
  { id: "magazine", name: "头条", hint: "第一篇放大" },
  { id: "stream", name: "目录", hint: "标题加日期" },
];

export function isLayoutId(value: string | null | undefined): value is LayoutId {
  return !!value && (LAYOUT_IDS as readonly string[]).includes(value);
}

export function parseLayoutId(value: string | null | undefined): LayoutId {
  return isLayoutId(value) ? value : DEFAULT_LAYOUT;
}
