import { getCountries } from "libphonenumber-js";

import {
  DEFAULT_COUNTRY,
  filterCountryOptions,
  getCountryOptions,
  getDialCode,
} from "./countries";

describe("countries", () => {
  it("defaults to Brazil", () => {
    expect(DEFAULT_COUNTRY).toBe("BR");
    expect(getDialCode(DEFAULT_COUNTRY)).toBe("+55");
  });

  it("names every country, leaving out the areas without an ISO country", () => {
    const options = getCountryOptions("en-US");
    const codes = options.map((option) => option.code);

    expect(options.every((option) => option.name !== option.code)).toBe(true);
    expect(codes).toContain("BR");
    expect(codes).not.toContain("AC");
    expect(getCountries().length - options.length).toBeLessThan(5);
  });

  it("names the countries in the language of the locale", () => {
    const nameOf = (locale: string) =>
      getCountryOptions(locale).find((option) => option.code === "ES")?.name;

    expect(nameOf("en-US")).toBe("Spain");
    expect(nameOf("pt-BR")).toBe("Espanha");
    expect(nameOf("es-ES")).toBe("España");
  });

  it("sorts by name", () => {
    const names = getCountryOptions("pt-BR").map((option) => option.name);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt")));
  });

  it("filters by a part of the name, ignoring case and accents", () => {
    const options = getCountryOptions("es-ES");

    expect(filterCountryOptions(options, "  ESPANA ").map((o) => o.code)).toEqual(["ES"]);
    expect(filterCountryOptions(options, "").length).toBe(options.length);
    expect(filterCountryOptions(options, "zzzz")).toEqual([]);
  });
});
