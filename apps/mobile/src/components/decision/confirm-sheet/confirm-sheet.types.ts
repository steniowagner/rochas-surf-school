import type { ReactNode } from "react";

import type { ButtonVariant } from "@/components/ui/button/button.types";

export type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** The glyph drawn before the confirm button's label. */
  confirmIcon: ReactNode;
  /** The confirm button's look; the default (primary) variant unless the action asks for another. */
  confirmVariant?: ButtonVariant;
  cancelLabel: string;
  /** True while the confirmed action is sent: the confirm button spins and ignores presses. */
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export type UseConfirmSheetProps = Pick<
  ConfirmSheetProps,
  "visible" | "description"
>;
