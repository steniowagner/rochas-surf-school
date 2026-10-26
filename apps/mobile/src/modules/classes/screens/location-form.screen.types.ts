import type { MapPlace } from "../classes.types";

/** What the admin fills on "Novo local" / "Editar local". */
export type LocationFormFields = {
  name: string;
  /** The point and its address; `null` until a place is picked. */
  place: MapPlace | null;
  /** Tell the people of the upcoming classes about the edit (only offered when the location has some). */
  notify: boolean;
};
