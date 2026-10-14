import { ClassLocation } from "../../classes.types";

export type LocationPickerProps = {
  locations: ClassLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddPress: () => void;
};
