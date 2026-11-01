import type { AdminMessage } from "../../notifications.types";

export type MessageSheetProps = {
  /** Kept while the sheet slides away, so its content doesn't vanish before it is gone. */
  message: AdminMessage | null;
  visible: boolean;
  onClose: () => void;
  /** With it, a message sent to a class shows the class's card, and pressing the card calls it. */
  onOpenClass?: (classId: string) => void;
};

export type UseMessageSheetProps = Omit<MessageSheetProps, "onClose">;
