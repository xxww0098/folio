export function EmptyInboxBox() {
  return (
    <div className="relative mx-auto grid h-36 w-40 place-items-center" aria-hidden="true">
      <div className="console-empty-orbit absolute bottom-5 left-1/2 -translate-x-1/2" />
      <span className="console-box-spark left-4 top-7" />
      <span className="console-box-spark right-6 top-4 h-1.5 w-1.5" />
      <span className="console-box-spark bottom-12 right-3 h-1 w-1" />
      <svg viewBox="0 0 120 110" className="relative h-28 w-28">
        <path d="M20 58 L60 80 L100 58 L60 36 Z" fill="#edf2f6" />
        <path d="M20 58 L20 82 L60 104 L60 80 Z" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
        <path d="M60 80 L60 104 L100 82 L100 58 Z" fill="#dbe3ea" />
        <path d="M28 62 L60 80 L92 62 L60 46 Z" fill="#111827" />
        <path d="M38 34 L78 18 L108 34 L70 52 Z" fill="#1f2937" />
        <path d="M78 18 L108 34 L98 40 L70 26 Z" fill="#374151" />
      </svg>
    </div>
  );
}
