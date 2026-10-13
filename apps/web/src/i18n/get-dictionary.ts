import type { Dictionary } from "./dictionary.types";
import type { Locale } from "./locales";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  "pt-br": () => import("./dictionaries/pt-br").then((module) => module.ptBr),
  es: () => import("./dictionaries/es").then((module) => module.es),
  en: () => import("./dictionaries/en").then((module) => module.en),
};

export const getDictionary = (locale: Locale): Promise<Dictionary> => dictionaries[locale]();
