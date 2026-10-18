import { ClassLocation } from "../../classes.types";

/** A row of the picker: an active location, or the location a class keeps after it was removed. */
export type PickerLocation = ClassLocation & {
  /** Removed since the class was saved: shown with the "Removido" chip and not editable. */
  archived?: boolean;
};

export type LocationPickerProps = {
  locations: PickerLocation[];
  selectedId: string | null;
  /** "Gerir": rows show a pencil and open the edit sheet instead of selecting; "Novo local" is hidden. */
  managing: boolean;
  onSelect: (id: string) => void;
  onEditPress: (location: PickerLocation) => void;
  onAddPress: () => void;
};
