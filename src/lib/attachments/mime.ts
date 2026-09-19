export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type ImageMime = (typeof IMAGE_MIMES)[number];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function isImageMime(value: string): value is ImageMime {
  return (IMAGE_MIMES as readonly string[]).includes(value);
}

export function sniffImageMime(bytes: Uint8Array, filename = "", declared = ""): ImageMime | null {
  if (bytes.length >= 6) {
    const head = String.fromCharCode(...bytes.subarray(0, 6));
    if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  if (isImageMime(declared)) return declared;
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "gif") return "image/gif";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return null;
}
