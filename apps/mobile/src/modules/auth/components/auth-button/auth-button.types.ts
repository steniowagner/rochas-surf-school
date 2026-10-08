import { ReactNode } from "react";

export type AuthButtonProps = {
  variant: "light" | "primary";
  label: string;
  icon: ReactNode;
  onPress?: () => void;
};
