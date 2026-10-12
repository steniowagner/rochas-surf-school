import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ComponentProps, ReactNode } from "react";

export type AccountStatusTone = "bad" | "dim" | "sand";

export type AccountStatusIcon = ComponentProps<
  typeof MaterialCommunityIcons
>["name"];

export type AccountStatusProps = {
  /** Colors the icon tile: `bad` for a closed account, `dim` for a quiet state, `sand` for a waiting one. */
  tone: AccountStatusTone;
  icon: AccountStatusIcon;
  eyebrow: string;
  title: string;
  /** A node, so the account's email can be bold. */
  description: ReactNode;
  /** A card under the description. Not rendered when omitted. */
  note?: { title: string; text: string };
  /** The primary action, drawn above "Use another email". Not rendered when omitted. */
  primaryAction?: ReactNode;
  onUseAnotherEmail: () => void;
};
