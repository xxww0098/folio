import type { VideoEmbedInfo } from "@/lib/blog/video-embed";

export function VideoEmbed({ info }: { info: VideoEmbedInfo }) {
  if (info.kind === "file") {
    return (
      <figure className="folio-video">
        <video controls playsInline preload="metadata" src={info.embed} title={info.title} />
      </figure>
    );
  }

  return (
    <figure className="folio-video">
      <iframe
        src={info.embed}
        title={info.title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </figure>
  );
}
