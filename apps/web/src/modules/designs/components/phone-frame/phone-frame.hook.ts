import { useEffect, useRef, useState } from "react";

import type { UseTallFrameResult } from "./phone-frame.types";

const FRAME_WIDTH = 402;

/** A tall frame is as high as its content at 402 points wide, and shrinks with it below that width. */
export const useTallFrame = (enabled: boolean): UseTallFrameResult => {
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;

    if (!enabled || !frame || !content) {
      return undefined;
    }

    const measure = () => {
      // The content scales with the frame's outer width (the container query) and the frame has a 1 point border.
      setScaledHeight((content.offsetHeight * frame.offsetWidth) / FRAME_WIDTH + 2);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(content);

    return () => observer.disconnect();
  }, [enabled]);

  return { frameRef, contentRef, scaledHeight };
};
