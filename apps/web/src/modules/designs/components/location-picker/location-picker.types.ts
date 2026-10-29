import type { Locale } from "@/i18n/locales";

export type PickerLocation = {
  id: string;
  name: string;
  address: string;
  /** Removed since the class was saved: shown with the "Removido" chip and not editable. */
  archived?: boolean;
};

export type LocationPickerProps = {
  locale: Locale;
  locations: PickerLocation[];
  selectedId: string | null;
  /** "Gerir": rows show a pencil and open the edit sheet instead of selecting; "Novo local" is hidden. */
  managing: boolean;
};
