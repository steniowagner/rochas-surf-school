import type { Locale } from "@/i18n/locales";

/**
 * `new`: "Novo local" before any point; `pointPicked`: a point tapped on the map, its address found and the name typed;
 * `edit`: "Editar local" of a saved place; `duplicate`: a name another place has; `archive`: "Remover local?" over the edit.
 */
export type LocationFormState = "new" | "pointPicked" | "edit" | "duplicate" | "archive";

export type LocationFormScreenProps = {
  locale: Locale;
  state: LocationFormState;
};
