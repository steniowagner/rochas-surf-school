import type { ClassToolsDeleteState } from "./class-tools-sheet.types";

export const DELETE_SUBTITLE_KEYS = {
  available: "classTools.deleteEmpty",
  started: "classTools.deleteStarted",
  enrolled: "classTools.deleteEnrolled",
} as const satisfies Record<ClassToolsDeleteState, string>;
