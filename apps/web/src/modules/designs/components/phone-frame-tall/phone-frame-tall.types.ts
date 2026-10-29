import type { ReactNode, RefObject } from "react";

export type PhoneFrameTallProps = {
  /** The status bar, the screen and the home indicator, as `PhoneFrame` lays them out. */
  children: ReactNode;
};

export type UsePhoneFrameTallResult = {
  frameRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  /** The height of the frame once the content is scaled down to a narrow viewport; `undefined` until measured. */
  scaledHeight: number | undefined;
};
