import { toBackendLocale } from "./backend-locale";
import { supportedLocales } from "./locales";

describe("toBackendLocale", () => {
  it.each([
    ["en-US", "en"],
    ["es-ES", "es"],
    ["pt-BR", "pt-BR"],
  ] as const)("maps %s to %s", (appLocale, backendLocale) => {
    expect(toBackendLocale(appLocale)).toBe(backendLocale);
  });

  it("covers every supported locale", () => {
    expect(supportedLocales.map(toBackendLocale)).toEqual(["en", "es", "pt-BR"]);
  });
});
