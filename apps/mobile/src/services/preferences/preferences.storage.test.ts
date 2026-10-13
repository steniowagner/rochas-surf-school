import * as SecureStore from "expo-secure-store";

import {
  readLocalePreference,
  readPushEnabledPreference,
  readThemePreference,
  writeLocalePreference,
  writePushEnabledPreference,
  writeThemePreference,
} from "./preferences.storage";

const store = jest.mocked(SecureStore);

describe("preferences.storage", () => {
  describe("theme", () => {
    it("defaults to system", () => {
      expect(readThemePreference()).toBe("system");
    });

    it("stores and reads the choice", () => {
      writeThemePreference("dark");

      expect(store.setItem).toHaveBeenCalledWith("prefs.theme", "dark");
      expect(readThemePreference()).toBe("dark");
    });

    it("treats an unknown value as system", () => {
      store.setItem("prefs.theme", "sepia");

      expect(readThemePreference()).toBe("system");
    });

    it("treats an unreadable store as system and ignores a failed write", () => {
      store.getItem.mockImplementationOnce(() => {
        throw new Error("locked");
      });
      store.setItem.mockImplementationOnce(() => {
        throw new Error("locked");
      });

      expect(readThemePreference()).toBe("system");
      expect(() => writeThemePreference("light")).not.toThrow();
    });
  });

  describe("locale", () => {
    it("is null when nothing is stored", () => {
      expect(readLocalePreference()).toBeNull();
    });

    it("stores and reads the choice", () => {
      writeLocalePreference("es-ES");

      expect(store.setItem).toHaveBeenCalledWith("prefs.locale", "es-ES");
      expect(readLocalePreference()).toBe("es-ES");
    });

    it("treats an unknown value as absent", () => {
      store.setItem("prefs.locale", "fr-FR");

      expect(readLocalePreference()).toBeNull();
    });
  });

  describe("push enabled", () => {
    it("is on by default", () => {
      expect(readPushEnabledPreference()).toBe(true);
    });

    it("stores and reads off and on", () => {
      writePushEnabledPreference(false);
      expect(readPushEnabledPreference()).toBe(false);

      writePushEnabledPreference(true);
      expect(readPushEnabledPreference()).toBe(true);
    });

    it("treats an unknown value as on", () => {
      store.setItem("prefs.pushEnabled", "maybe");

      expect(readPushEnabledPreference()).toBe(true);
    });
  });
});
