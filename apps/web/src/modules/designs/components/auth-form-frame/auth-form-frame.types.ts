import type { ReactNode } from "react";

export type AuthFormFrameProps = {
  /** Under the intro: the fields and rows. */
  children: ReactNode;
  /** At the bottom of the screen: the button and the lines around it. */
  footer: ReactNode;
  /** The intro of the screen. */
  intro: ReactNode;
  /** The toast the screen shows, when it shows one. */
  toastMessage?: string;
};
