/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories can only load modules with require */

import "react-native-gesture-handler/jestSetup";

import i18n from "@/i18n";

jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [{ languageCode: "en" }]),
}));

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

// The library's mock has no `__esModule` flag, so without it the default import would be the whole module.
jest.mock("@gorhom/bottom-sheet", () => ({
  __esModule: true,
  ...require("@gorhom/bottom-sheet/mock"),
}));

// Every test starts in English (US), as when the OS language is English.
beforeEach(async () => {
  await i18n.changeLanguage("en-US");
});
