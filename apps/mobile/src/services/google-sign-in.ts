import { GoogleSignin } from "@react-native-google-signin/google-signin";

// Configured once, when this module loads. The ID token it issues names the web client as its audience, which is
// what the backend checks. The iOS URL scheme is in app.json, in the library's config plugin.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

export { GoogleSignin };
export {
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
