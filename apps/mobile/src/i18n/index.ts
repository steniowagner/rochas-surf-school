import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { defaultLocale, getDeviceLocale } from "./locales";
import enUS from "./messages/en-US";
import esES from "./messages/es-ES";
import ptBR from "./messages/pt-BR";

// i18next initializes synchronously when resources are inline, so translations are ready before the first render.
// eslint-disable-next-line import/no-named-as-default-member -- `use` is i18next's documented plugin method, not a misuse.
i18n.use(initReactI18next).init({
  resources: {
    "en-US": { translation: enUS },
    "es-ES": { translation: esES },
    "pt-BR": { translation: ptBR },
  },
  lng: getDeviceLocale(),
  fallbackLng: defaultLocale,
  interpolation: {
    // React already escapes output, so i18next must not escape it a second time.
    escapeValue: false,
  },
});

export default i18n;
