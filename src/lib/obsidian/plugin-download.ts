import { zipStore } from "./zip";

const PLUGIN_FILES = ["manifest.json", "main.js", "styles.css"] as const;

export async function downloadFolioPlugin() {
  const files = await Promise.all(
    PLUGIN_FILES.map(async (name) => {
      const response = await fetch(`/obsidian-folio/${name}`);
      if (!response.ok) throw new Error("无法读取插件文件");
      const buffer = await response.arrayBuffer();
      return { path: `folio/${name}`, body: new Uint8Array(buffer) };
    }),
  );
  const zip = zipStore(files);
  const copy = new ArrayBuffer(zip.byteLength);
  new Uint8Array(copy).set(zip);
  const blob = new Blob([copy], { type: "application/zip" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = "folio-obsidian.zip";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
