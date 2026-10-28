import type { ReactNode } from "react";

export type PhoneFrameProps = {
  children: ReactNode;
  /** Printed under the frame. */
  caption?: string;
  /** The time in the status bar. */
  time?: string;
  /** Lays the content out from the status bar down: a screen fills the frame; a sheet sits at its bottom. */
  contentClassName?: string;
};
