import { Feather } from "@expo/vector-icons";
import { ComponentProps } from "react";

import { PeopleRole, RoleAction } from "../people.types";

/** The actions on the sheet of a person with each role, in the order they show (spec 058, D-12). */
export const ROLE_ACTIONS: Record<PeopleRole, readonly RoleAction[]> = {
  student: ["promoteInstructor", "promoteAdmin"],
  instructor: ["promoteAdmin", "demoteStudent"],
  admin: ["adminToInstructor"],
};

/** The role each action gives the person. */
export const ROLE_ACTION_TARGET: Record<RoleAction, PeopleRole> = {
  promoteInstructor: "instructor",
  promoteAdmin: "admin",
  demoteStudent: "student",
  adminToInstructor: "instructor",
};

/** How each action is drawn: its icon, and whether it takes something away (the danger tone). */
export const ROLE_ACTION_LOOK: Record<
  RoleAction,
  { icon: ComponentProps<typeof Feather>["name"]; danger: boolean }
> = {
  promoteInstructor: { icon: "user-check", danger: false },
  promoteAdmin: { icon: "shield", danger: false },
  demoteStudent: { icon: "user-minus", danger: true },
  adminToInstructor: { icon: "shield-off", danger: true },
};
