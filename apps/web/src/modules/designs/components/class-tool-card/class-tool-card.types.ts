import type { AppIconName } from "../app-icon";

export type ClassToolCardProps = {
  icon: AppIconName;
  title: string;
  /** Drawn small under the title. */
  subtitle: string;
  /** `danger` draws the card on `bad-tint`, with the title and the icon in `bad`. */
  tone?: "default" | "danger";
  /** Faded and marked disabled. */
  disabled?: boolean;
};
