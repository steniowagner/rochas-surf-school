import type { PhoneFrameProps } from "./phone-frame.types";

// iOS frame, 402 × 874 points as the prototypes draw it. Below its width it scales down (CSS container query units).
export function PhoneFrame({ children, caption, time = "9:41", contentClassName = "", fullBleed = false }: PhoneFrameProps) {
  return (
    <figure className="flex w-full max-w-100.5 flex-col gap-2" style={{ containerType: "inline-size" }}>
      <div
        data-testid="phone-frame"
        className="relative w-full overflow-hidden rounded-[44px] border border-line bg-page text-ink shadow-card"
        style={{ aspectRatio: "402 / 874" }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: 402, height: 874, transform: "scale(calc(100cqw / 402px))" }}
        >
          <div className={`flex h-14 items-center justify-between px-8 pt-3 ${fullBleed ? "absolute inset-x-0 top-0 z-20 text-on-color" : ""}`}>
            <span className="ds-text-list-title">{time}</span>
            <span className="h-7 w-24 rounded-full bg-ink" aria-hidden />
            <span className="ds-text-list-title" aria-hidden>●●●</span>
          </div>
          <div className={`relative flex flex-col ${fullBleed ? "h-[874px]" : "h-[calc(874px-56px)]"} ${contentClassName}`}>{children}</div>
          <div className="absolute bottom-2 left-1/2 h-1.25 w-34 -translate-x-1/2 rounded-full bg-ink" aria-hidden />
        </div>
      </div>
      {caption ? <figcaption className="ds-text-list-subtitle text-center text-ink-2">{caption}</figcaption> : null}
    </figure>
  );
}
