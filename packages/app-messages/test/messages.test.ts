import { enUS, esES, messages, ptBR } from "../src";

function keysOf(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key));
}

function diffKeys(expected: unknown, actual: unknown) {
  const expectedKeys = keysOf(expected);
  const actualKeys = keysOf(actual);
  return {
    missing: expectedKeys.filter((key) => !actualKeys.includes(key)),
    extra: actualKeys.filter((key) => !expectedKeys.includes(key)),
  };
}

describe("app messages", () => {
  it("exports the three locales by their tag", () => {
    expect(messages).toEqual({ "en-US": enUS, "es-ES": esES, "pt-BR": ptBR });
  });

  it.each([
    ["es-ES", esES],
    ["pt-BR", ptBR],
  ])("%s has exactly the keys of en-US", (_tag, locale) => {
    expect(diffKeys(enUS, locale)).toEqual({ missing: [], extra: [] });
  });

  it("names the keys that are missing or added", () => {
    expect(diffKeys({ a: { b: "x", c: "y" } }, { a: { b: "x", d: "z" } })).toEqual({ missing: ["a.c"], extra: ["a.d"] });
  });
});
