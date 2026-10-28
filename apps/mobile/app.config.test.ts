import type { ConfigContext } from "expo/config";

import { expo } from "./app.json";
import createConfig from "./app.config";

const contextOf = (config: unknown) => ({ config }) as ConfigContext;

const original = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

afterEach(() => {
  if (original === undefined) {
    delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  } else {
    process.env.GOOGLE_MAPS_ANDROID_API_KEY = original;
  }
});

describe("app.config", () => {
  it("adds the react-native-maps plugin with the Android key from the environment", () => {
    process.env.GOOGLE_MAPS_ANDROID_API_KEY = "android-key";

    const config = createConfig(contextOf(expo));

    expect(config.plugins).toContainEqual([
      "react-native-maps",
      { androidGoogleMapsApiKey: "android-key" },
    ]);
  });

  it("keeps the other plugins and the rest of app.json", () => {
    const config = createConfig(contextOf(expo));

    expect(config.plugins?.slice(0, expo.plugins.length)).toEqual(expo.plugins);
    expect(config.plugins).toHaveLength(expo.plugins.length + 1);
    expect(config.name).toBe(expo.name);
    expect(config.slug).toBe(expo.slug);
    expect(config.ios?.bundleIdentifier).toBe(expo.ios.bundleIdentifier);
  });

  it("leaves the key undefined when the environment has none", () => {
    delete process.env.GOOGLE_MAPS_ANDROID_API_KEY;

    const config = createConfig(contextOf(expo));

    expect(config.plugins?.at(-1)).toEqual([
      "react-native-maps",
      { androidGoogleMapsApiKey: undefined },
    ]);
  });

  it("falls back to the app name and slug when the base config has none", () => {
    const config = createConfig(contextOf({}));

    expect(config.name).toBe("RSS");
    expect(config.slug).toBe("rochas-surf-school");
    expect(config.plugins).toHaveLength(1);
  });
});
