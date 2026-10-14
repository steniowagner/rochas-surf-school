export const CLASS_DISCIPLINES = ["surf", "skate"] as const;
export const CLASS_LEVELS = ["beginner", "advanced", "expert"] as const;

export type ClassDiscipline = (typeof CLASS_DISCIPLINES)[number];
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export const CLASS_CAPACITY_MIN = 1;
export const CLASS_CAPACITY_MAX = 20;
export const CLASS_NOTES_MAX = 300;
export const CLASS_BATCH_MAX = 200;

export const CLASS_TIME_ZONE = "America/Fortaleza";
