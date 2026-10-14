import { ReactNode } from "react";

export type BottomModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /**
   * Whether dragging the content moves the sheet (default). Turn it off when the content has native controls that
   * scroll by dragging, such as a time wheel: the sheet would take the drag. The handle still drags and closes it.
   */
  contentPanningEnabled?: boolean;
};

export type UseBottomModalProps = Pick<BottomModalProps, "visible" | "onClose">;
