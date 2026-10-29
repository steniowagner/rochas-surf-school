import type { PersonRole } from "../person-row/person-row.types";

import type { RoleAction, RoleActionLook } from "./person-role-actions.types";

/** The actions on the sheet of a person with each role, in the order they show (the app's `ROLE_ACTIONS`). */
export const ROLE_ACTIONS: Record<PersonRole, readonly RoleAction[]> = {
  student: ["promoteInstructor", "promoteAdmin"],
  instructor: ["promoteAdmin", "demoteStudent"],
  admin: ["adminToInstructor"],
};

/** How each action is drawn: its icon, and whether it takes something away (the danger tone). */
export const ROLE_ACTION_LOOK: Record<RoleAction, RoleActionLook> = {
  promoteInstructor: { icon: "Feather:user-check", danger: false },
  promoteAdmin: { icon: "Feather:shield", danger: false },
  demoteStudent: { icon: "Feather:user-minus", danger: true },
  adminToInstructor: { icon: "Feather:shield-off", danger: true },
};
