import { SuggestionLanguage } from "../provider";

export const SUGGESTION_QUERY_MIN = 3;
export const SUGGESTION_QUERY_MAX = 100;
export const SUGGESTION_RESULTS_MAX = 5;

const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const LANGUAGES: SuggestionLanguage[] = ["pt-BR", "es", "en"];

export function isValidSessionToken(value: unknown): value is string {
  return typeof value === "string" && SESSION_TOKEN_PATTERN.test(value);
}

export function toSuggestionLanguage(value: unknown): SuggestionLanguage {
  return LANGUAGES.includes(value as SuggestionLanguage) ? (value as SuggestionLanguage) : "pt-BR";
}
