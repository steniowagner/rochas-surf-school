const formatters = new Map<string, Intl.DateTimeFormat>();

/** "12 Oct 2026", in the app language and the school's time zone; one formatter per language. */
export const formatReactivationDate = (
  isoDate: string,
  language: string,
): string => {
  let formatter = formatters.get(language);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(language, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "America/Fortaleza",
    });
    formatters.set(language, formatter);
  }

  return formatter.format(new Date(isoDate));
};
