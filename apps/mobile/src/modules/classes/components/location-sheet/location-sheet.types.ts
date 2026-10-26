import {
  AddressSuggestion,
  ClassLocation,
  MapPoint,
} from "../../classes.types";

export type LocationSheetProps = {
  visible: boolean;
  /** The active locations, to tell a repeated name before sending it. */
  locations: ClassLocation[];
  /** The location being edited ("Editar local"); none for "Novo local". */
  location?: ClassLocation | null;
  onClose: () => void;
  /** Called with the new location; the screen selects it. */
  onCreated: (location: ClassLocation) => void;
  /** Called with the id of the location that was removed (or found already gone), after the sheet closed. */
  onRemoved?: (id: string) => void;
};

export type UseLocationSheetProps = LocationSheetProps;

export type LocationSheetFields = {
  name: string;
  address: string;
  point: MapPoint | null;
  notify: boolean;
};

export type { AddressSuggestion };
