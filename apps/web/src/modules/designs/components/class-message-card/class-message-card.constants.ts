import type { ChipTone } from "../chip/chip.types";

import type { ClassMessagePerson } from "./class-message-card.types";

/** The chip of each person's role in the list. */
export const ROLE_TONE: Record<ClassMessagePerson["role"], ChipTone> = { instructor: "muted", student: "info", pending: "warn" };
