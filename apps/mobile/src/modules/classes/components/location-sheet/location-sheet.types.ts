import { ClassLocation } from "../../classes.types";

export type LocationSheetProps = {
  visible: boolean;
  /** The saved locations, to tell a repeated name before sending it. */
  locations: ClassLocation[];
  onClose: () => void;
  /** Called with the saved location; the screen selects it. */
  onCreated: (location: ClassLocation) => void;
};

export type UseLocationSheetProps = LocationSheetProps;
