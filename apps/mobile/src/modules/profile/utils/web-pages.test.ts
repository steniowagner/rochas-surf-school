import { getWebPageUrl } from "./web-pages";

describe("getWebPageUrl", () => {
  const original = process.env.EXPO_PUBLIC_WEB_URL;

  afterEach(() => {
    process.env.EXPO_PUBLIC_WEB_URL = original;
  });

  it.each([
    ["pt-BR", "pt-br"],
    ["es-ES", "es"],
    ["en-US", "en"],
  ] as const)("uses the %s language segment %s", (locale, segment) => {
    process.env.EXPO_PUBLIC_WEB_URL = "http://localhost:3000";

    expect(getWebPageUrl("privacy-policy", locale)).toBe(
      `http://localhost:3000/${segment}/privacy-policy`,
    );
    expect(getWebPageUrl("terms-of-use", locale)).toBe(
      `http://localhost:3000/${segment}/terms-of-use`,
    );
  });

  it("drops a trailing slash", () => {
    process.env.EXPO_PUBLIC_WEB_URL = "https://rochas.example.com//";

    expect(getWebPageUrl("terms-of-use", "pt-BR")).toBe(
      "https://rochas.example.com/pt-br/terms-of-use",
    );
  });

  it("is null without the variable", () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;

    expect(getWebPageUrl("privacy-policy", "en-US")).toBeNull();

    process.env.EXPO_PUBLIC_WEB_URL = "";
    expect(getWebPageUrl("privacy-policy", "en-US")).toBeNull();
  });
});
