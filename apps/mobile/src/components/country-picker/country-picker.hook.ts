import type { CountryCode } from "libphonenumber-js";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { filterCountryOptions, getCountryOptions } from "@/utils/countries";

import { UseCountryPickerProps } from "./country-picker.types";

export const useCountryPicker = ({
  onClose,
  onSelect,
}: UseCountryPickerProps) => {
  const { i18n } = useTranslation();
  const [query, setQuery] = useState("");

  // About 250 names, sorted: rebuilt only when the app language changes.
  const options = useMemo(
    () => getCountryOptions(i18n.language),
    [i18n.language],
  );

  const visibleOptions = filterCountryOptions(options, query);

  const close = () => {
    setQuery("");
    onClose();
  };

  const select = (country: CountryCode) => {
    setQuery("");
    onSelect(country);
    onClose();
  };

  return { query, setQuery, visibleOptions, close, select };
};
