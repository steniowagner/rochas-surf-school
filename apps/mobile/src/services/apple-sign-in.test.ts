import * as AppleAuthentication from "expo-apple-authentication";

import { requestAppleCredential } from "./apple-sign-in";

const signInAsync = jest.mocked(AppleAuthentication.signInAsync);

describe("apple-sign-in service", () => {
  beforeEach(() => {
    signInAsync.mockReset();
  });

  it("asks Apple for the full name and the email, and answers the credential", async () => {
    const credential = { user: "sub-1", identityToken: "token" };
    signInAsync.mockResolvedValue(
      credential as AppleAuthentication.AppleAuthenticationCredential,
    );

    await expect(requestAppleCredential()).resolves.toBe(credential);

    expect(signInAsync).toHaveBeenCalledWith({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  });

  it("lets the library's errors through", async () => {
    const error = Object.assign(new Error("canceled"), {
      code: "ERR_REQUEST_CANCELED",
    });
    signInAsync.mockRejectedValue(error);

    await expect(requestAppleCredential()).rejects.toBe(error);
  });
});
