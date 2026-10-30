import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * Everything lives in app.json; this file only adds what needs the environment: the react-native-maps config plugin
 * with the Google Maps key of Android (iOS draws Apple Maps and needs no key), and on EAS, where GOOGLE_SERVICES_JSON
 * is a file variable holding the file's path, the Firebase file Android push needs.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? "RSS",
  slug: config.slug ?? "rochas-surf-school",
  ...(process.env.GOOGLE_SERVICES_JSON && {
    android: {
      ...config.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
    },
  }),
  plugins: [
    ...(config.plugins ?? []),
    [
      "react-native-maps",
      { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY },
    ],
  ],
});
