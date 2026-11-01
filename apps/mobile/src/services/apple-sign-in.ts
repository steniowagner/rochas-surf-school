import * as AppleAuthentication from "expo-apple-authentication";

/** The code of the error the library throws when the person closes Apple's sheet. */
export const APPLE_SIGN_IN_CANCELED = "ERR_REQUEST_CANCELED";

export const requestAppleCredential = () =>
  AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
