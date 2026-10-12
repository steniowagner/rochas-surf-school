/* eslint-disable @typescript-eslint/no-require-imports -- isolateModules needs a synchronous require */

describe("google-sign-in service", () => {
  it("configures the SDK once, at load, with the web and iOS client ids", () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = "web-client";
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = "ios-client";

    jest.isolateModules(() => {
      const library = jest.requireMock(
        "@react-native-google-signin/google-signin",
      );
      library.GoogleSignin.configure.mockClear();

      const service = require("./google-sign-in");

      expect(library.GoogleSignin.configure).toHaveBeenCalledTimes(1);
      expect(library.GoogleSignin.configure).toHaveBeenCalledWith({
        webClientId: "web-client",
        iosClientId: "ios-client",
      });
      expect(service.GoogleSignin).toBe(library.GoogleSignin);
      expect(service.statusCodes).toBe(library.statusCodes);
    });
  });
});
