export function normalizeSchoolRuleText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
