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

// The native module isn't available under Jest. Tests drive `signIn` / `hasPlayServices` / `signOut` directly.
jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(null),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  },
  isErrorWithCode: (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error,
}));

// Every test starts in English (US), as when the OS language is English.
beforeEach(async () => {
  await i18n.changeLanguage("en-US");
});

// In-memory stand-in for the native keychain; the store is reset between tests.
const mockSecureStoreData = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(
    async (key: string) => mockSecureStoreData.get(key) ?? null,
  ),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStoreData.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStoreData.delete(key);
  }),
}));

beforeEach(() => {
  mockSecureStoreData.clear();
  const SecureStore = jest.requireMock("expo-secure-store");
  SecureStore.getItemAsync.mockClear();
  SecureStore.setItemAsync.mockClear();
  SecureStore.deleteItemAsync.mockClear();
});
