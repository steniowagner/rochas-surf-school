import { useState } from "react";

import { ClassLocation } from "../classes.types";

/**
 * The "Gerir" mode of the Local section and the location sheet it opens, for Nova aula and Editar aula: "Novo local"
 * (no location) or "Editar local" (the row that was pressed). The mode ends by itself once no location is left.
 */
export const useLocationManagement = (canManage: boolean) => {
  const [managingRequested, setManagingRequested] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing] = useState<ClassLocation | null>(null);

  return {
    managing: managingRequested && canManage,
    toggleManaging: () => setManagingRequested((current) => !current),
    sheetVisible,
    editing,
    openNew: () => {
      setEditing(null);
      setSheetVisible(true);
    },
    openEdit: (location: ClassLocation) => {
      setEditing(location);
      setSheetVisible(true);
    },
    closeSheet: () => setSheetVisible(false),
  };
};
