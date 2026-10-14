import * as SecureStore from "expo-secure-store";

describe("i18n start", () => {
  const start = () => {
    let language = "";

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- a fresh module copy is the point
      language = (require("./index") as typeof import("./index")).default
        .language;
    });

    return language;
  };

  it("starts from the phone's language when no language was chosen", () => {
    expect(start()).toBe("en-US");
  });

  it("starts from the stored language", () => {
    jest.mocked(SecureStore).setItem("prefs.locale", "es-ES");

    expect(start()).toBe("es-ES");
  });

  it("ignores an unknown stored language", () => {
    jest.mocked(SecureStore).setItem("prefs.locale", "fr-FR");

    expect(start()).toBe("en-US");
  });
});
