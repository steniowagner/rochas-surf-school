import type { NoticeAudience } from "./notices.types";

// Spec 063, D-01: the limits the backend enforces.
export const NOTICE_TITLE_MAX_LENGTH = 60;
export const NOTICE_MESSAGE_MAX_LENGTH = 500;

export const NOTICE_AUDIENCES: NoticeAudience[] = ["all", "students", "instructors"];
