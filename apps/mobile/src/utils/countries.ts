import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
} from "libphonenumber-js";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import es from "i18n-iso-countries/langs/es.json";
import pt from "i18n-iso-countries/langs/pt.json";

import type { CountryOption } from "./countries.types";

countries.registerLocale(en);
countries.registerLocale(es);
countries.registerLocale(pt);

export const DEFAULT_COUNTRY: CountryCode = "BR";

// The app locale (en-US, es-ES, pt-BR) is keyed by its language code, as in `@/i18n/locales`.
const toLanguage = (locale: string) => locale.slice(0, 2);

export const getDialCode = (country: CountryCode) =>
  `+${getCountryCallingCode(country)}`;

/**
 * Every country `libphonenumber-js` knows that has a name, in the given app locale, sorted by name. The calling
 * code areas without an ISO country (such as Ascension Island, `AC`) have no name and are left out.
 */
export const getCountryOptions = (locale: string): CountryOption[] => {
  const language = toLanguage(locale);

  return getCountries()
    .flatMap((code) => {
      const name = countries.getName(code, language);

      return name ? [{ code, name, dialCode: getDialCode(code) }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name, language));
};

const normalize = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Keeps the countries whose name contains the query, ignoring case and accents. */
export const filterCountryOptions = (
  options: CountryOption[],
  query: string,
) => {
  const normalizedQuery = normalize(query);

  return options.filter((option) =>
    normalize(option.name).includes(normalizedQuery),
  );
};
