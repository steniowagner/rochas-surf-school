import { ReactNode } from "react";

export type BottomModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export type UseBottomModalProps = Pick<BottomModalProps, "visible">;
