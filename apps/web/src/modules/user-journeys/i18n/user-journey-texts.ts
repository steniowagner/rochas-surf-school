import type { Locale } from "@/i18n/locales";

import { en } from "./en";
import { es } from "./es";
import { ptBr } from "./pt-br";
import type { UserJourneyTexts } from "./user-journey-texts.types";

/** The user journey texts of each site language. */
export const userJourneyTexts: Record<Locale, UserJourneyTexts> = { "pt-br": ptBr, es, en };
