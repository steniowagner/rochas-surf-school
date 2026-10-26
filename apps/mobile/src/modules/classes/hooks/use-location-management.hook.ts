import { useState } from "react";

/**
 * The "Gerir" mode of the Local section, for Nova aula and Editar aula: its rows open "Editar local" instead of
 * selecting. The mode ends by itself once no location is left.
 */
export const useLocationManagement = (canManage: boolean) => {
  const [managingRequested, setManagingRequested] = useState(false);

  return {
    managing: managingRequested && canManage,
    toggleManaging: () => setManagingRequested((current) => !current),
  };
};
