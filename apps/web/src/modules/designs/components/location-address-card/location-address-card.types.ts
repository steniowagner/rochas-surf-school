import type { Locale } from "@/i18n/locales";

export type LocationAddressCardProps = {
  locale: Locale;
  /** The place picked so far: its address, the place's name when it came from a suggestion, and the point as "-3.7190, -38.5020". */
  place: { address: string; name?: string; point: string } | null;
  /** An address is being looked up for `pendingPoint`. */
  resolving?: boolean;
  /** The point that was tapped while its address is looked up. */
  pendingPoint?: string;
};
