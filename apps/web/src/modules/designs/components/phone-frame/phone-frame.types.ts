import type { ReactNode } from "react";

export type PhoneFrameProps = {
  children: ReactNode;
  /** Printed under the frame. */
  caption?: string;
  /** The time in the status bar. */
  time?: string;
  /** Lays the content out from the status bar down: a screen fills the frame; a sheet sits at its bottom. */
  contentClassName?: string;
  /** The content fills the whole frame and the status bar is drawn over it, as on a full-bleed screen. */
  fullBleed?: boolean;
  /** The frame grows to the whole scrolled content of a screen longer than the phone (spec 073 D-02). */
  tall?: boolean;
};
