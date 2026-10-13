import { describe, expect, it } from "vitest";

import { hasLocale, matchLocale } from "./locales";

describe("matchLocale", () => {
  it("picks the first supported language in quality order", () => {
    expect(matchLocale("de;q=0.9, en;q=0.8, es;q=0.95")).toBe("es");
    expect(matchLocale("fr, en, pt")).toBe("en");
  });

  it("keeps header order between entries with the same quality", () => {
    expect(matchLocale("es;q=0.5, en;q=0.5")).toBe("es");
  });

  it("maps regional variants to their locale", () => {
    expect(matchLocale("pt-PT")).toBe("pt-br");
    expect(matchLocale("es-MX")).toBe("es");
    expect(matchLocale("en-GB")).toBe("en");
  });

  it("ignores entries with q=0", () => {
    expect(matchLocale("es;q=0, en;q=0.5")).toBe("en");
  });

  it("falls back to pt-br for a missing, empty or unsupported header", () => {
    expect(matchLocale(undefined)).toBe("pt-br");
    expect(matchLocale(null)).toBe("pt-br");
    expect(matchLocale("")).toBe("pt-br");
    expect(matchLocale("de, fr;q=0.8")).toBe("pt-br");
  });
});

describe("hasLocale", () => {
  it("accepts only pt-br, es and en", () => {
    expect(hasLocale("pt-br")).toBe(true);
    expect(hasLocale("es")).toBe(true);
    expect(hasLocale("en")).toBe(true);
    expect(hasLocale("pt-BR")).toBe(false);
    expect(hasLocale("de")).toBe(false);
    expect(hasLocale("")).toBe(false);
  });
});
