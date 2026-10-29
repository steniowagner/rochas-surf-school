"use client";

import { usePhoneFrameTall } from "./phone-frame-tall.hook";
import type { PhoneFrameTallProps } from "./phone-frame-tall.types";

/** The frame of a screen longer than the phone: as high as its content, scaled down below 402 points wide. */
export function PhoneFrameTall({ children }: PhoneFrameTallProps) {
  const { frameRef, contentRef, scaledHeight } = usePhoneFrameTall();

  return (
    <div
      ref={frameRef}
      data-testid="phone-frame"
      data-tall=""
      className="relative w-full overflow-hidden rounded-[44px] border border-line bg-page text-ink shadow-card"
      style={{ height: scaledHeight }}
    >
      <div ref={contentRef} className="relative origin-top-left" style={{ width: 402, transform: "scale(calc(100cqw / 402px))" }}>
        {children}
      </div>
    </div>
  );
}
