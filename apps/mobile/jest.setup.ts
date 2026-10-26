/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories can only load modules with require */

import "react-native-gesture-handler/jestSetup";

import i18n from "@/i18n";
import { resetSessionStore } from "@/services/session/session.store";

jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [{ languageCode: "en" }]),
}));

// There is no navigator (so no header) around a component rendered alone: a fixed header height in its place.
jest.mock("@/navigation/stack-header/keyboard-offset.hook", () => ({
  useKeyboardOffset: jest.fn(() => 64),
}));
jest.mock("@/navigation/stack-header/header-inset.hook", () => ({
  useHeaderInset: jest.fn(() => 0),
}));

// The library's mock of the animated keyboard keeps its height as a plain number: a closed keyboard, as a shared value.
jest.mock("@/hooks/use-keyboard-height.hook", () => ({
  useKeyboardHeight: jest.fn(() => ({ get: () => 0 })),
}));

// No native module in Jest: the opaque header by default, a test turns Liquid Glass on.
jest.mock("expo-glass-effect", () => ({
  isLiquidGlassAvailable: jest.fn(() => false),
  GlassView: require("react-native").View,
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

// The native pieces of push: tests drive these `jest.fn`s directly (permission, token, listeners).
jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
  getExpoPushTokenAsync: jest
    .fn()
    .mockResolvedValue({ data: "ExponentPushToken[test]" }),
  getLastNotificationResponse: jest.fn(() => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// The native time picker isn't available under Jest: a plain view that keeps the value and the change handler, so
// tests read the value and drive `valueChange` with `fireEvent`.
jest.mock("@expo/ui/community/datetime-picker", () => {
  const DateTimePicker = ({
    value,
    onValueChange,
    style,
    testID,
  }: Record<string, unknown>) =>
    require("react").createElement("View", {
      testID,
      value,
      onValueChange,
      style,
    });

  return { __esModule: true, default: DateTimePicker, DateTimePicker };
});

// The native map isn't available under Jest: host views that keep their props (`onPress`, `region`, `coordinate`,
// `scrollEnabled`…), so tests read them and drive a tap with `fireEvent.press(map, { nativeEvent: { coordinate } })`.
// A ref to the map gets `animateToRegion`, the shared `mockAnimateToRegion` the tests read.
jest.mock("react-native-maps", () => {
  const mockAnimateToRegion = jest.fn();
  // A class, so a ref to it has the method (and the React Compiler leaves it alone).
  class MapView extends require("react").Component<Record<string, unknown>> {
    animateToRegion(...args: unknown[]) {
      mockAnimateToRegion(...args);
    }

    render() {
      return require("react").createElement("MapView", this.props);
    }
  }
  const Marker = (props: Record<string, unknown>) =>
    require("react").createElement("Marker", props);

  return {
    __esModule: true,
    default: MapView,
    MapView,
    Marker,
    PROVIDER_GOOGLE: "google",
    PROVIDER_DEFAULT: null,
    mockAnimateToRegion,
  };
});

// The device's location isn't available under Jest: permission granted, a position in Fortaleza and no address by
// default; tests drive these `jest.fn`s directly (denied, a failed read, a reverse-geocoded address).
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: "granted", granted: true }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: -3.7319, longitude: -38.5267 },
  }),
  reverseGeocodeAsync: jest.fn().mockResolvedValue([]),
}));

jest.mock("expo-device", () => ({ isDevice: true }));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: "project-id" } } },
    easConfig: null,
  },
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
  // The synchronous pair the device preferences use.
  getItem: jest.fn((key: string) => mockSecureStoreData.get(key) ?? null),
  setItem: jest.fn((key: string, value: string) => {
    mockSecureStoreData.set(key, value);
  }),
}));

beforeEach(() => {
  // The session store is module state: every test starts as a fresh launch.
  resetSessionStore();
  mockSecureStoreData.clear();
  const SecureStore = jest.requireMock("expo-secure-store");
  SecureStore.getItemAsync.mockClear();
  SecureStore.setItemAsync.mockClear();
  SecureStore.deleteItemAsync.mockClear();
  SecureStore.getItem.mockClear();
  SecureStore.setItem.mockClear();
});
