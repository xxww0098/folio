import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max <= 0 ? 0 : Math.min(100, (el.scrollTop / max) * 100));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Progress
      value={progress}
      aria-hidden
      className="pointer-events-none fixed top-[calc(3.5rem+env(safe-area-inset-top))] right-0 left-0 z-40 h-0.5 rounded-none bg-transparent sm:top-[calc(4rem+env(safe-area-inset-top))]"
    />
  );
}
