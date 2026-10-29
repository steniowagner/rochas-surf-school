import type { Locale } from "@/i18n/locales";

export type CapacityStepperProps = {
  locale: Locale;
  value: number;
  min: number;
  max: number;
};
