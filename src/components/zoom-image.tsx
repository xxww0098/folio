import { useState, type ImgHTMLAttributes } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ZoomImage({
  src,
  alt,
  className,
  zoom = true,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement> & { zoom?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!src) return null;

  const img = (
    <img
      alt={alt ?? ""}
      {...rest}
      src={src}
      loading="lazy"
      decoding="async"
      className={cn(className)}
    />
  );

  if (!zoom) return img;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in rounded-[inherit] text-left"
        aria-label={alt ? `查看：${alt}` : "查看图片"}
      >
        {img}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-1/2 w-[calc(100%-1.5rem)] max-w-6xl -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-2 shadow-none [&>button]:text-primary-foreground [&>button]:hover:bg-primary-foreground/10">
          <DialogTitle className="sr-only">{alt || "图片"}</DialogTitle>
          <img src={src} alt={alt ?? ""} className="max-h-screen w-full rounded-lg object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}
