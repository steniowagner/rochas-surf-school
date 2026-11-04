import type { ReactNode } from "react";

import type { ButtonVariant } from "../button/button.types";

export type ConfirmSheetProps = {
  title: string;
  description: string;
  confirmLabel: string;
  /** The glyph drawn before the confirm button's label. */
  confirmIcon: ReactNode;
  /** The confirm button's look; the default (primary) variant unless the action asks for another. */
  confirmVariant?: ButtonVariant;
  cancelLabel: string;
  /** Draws the confirm button spinning, as while the confirmed action is sent. */
  loading?: boolean;
};
