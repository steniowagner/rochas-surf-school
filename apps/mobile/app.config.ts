import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Everything lives in app.json; this file only adds what needs the environment: the react-native-maps config plugin
 * with the Google Maps key of Android. iOS draws Apple Maps and needs no key.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "Rocha's Surf School",
  slug: config.slug ?? "rochas-surf-school",
  plugins: [
    ...(config.plugins ?? []),
    [
      "react-native-maps",
      { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    ],
  ],
});
