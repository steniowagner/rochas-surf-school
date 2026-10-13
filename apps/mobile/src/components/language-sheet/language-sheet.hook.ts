import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { type AppLocale } from "@/i18n/locales";
import { writeLocalePreference } from "@/services/preferences/preferences.storage";

import { UseLanguageSheetProps } from "./language-sheet.types";

export const useLanguageSheet = ({ onClose }: UseLanguageSheetProps) => {
  const { i18n } = useTranslation();

  const selectLocale = useCallback(
    (locale: AppLocale) => {
      void i18n.changeLanguage(locale);
      writeLocalePreference(locale);
      onClose();
    },
    [onClose, i18n],
  );

  return {
    selectLocale,
  };
};
