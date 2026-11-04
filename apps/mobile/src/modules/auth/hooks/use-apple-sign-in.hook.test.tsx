import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { router } from "expo-router";
import { ReactNode } from "react";

import { routes } from "@/constants/routes";
import { AlertMessageProvider } from "@/providers/alert-message";
import { ApiError, NetworkError } from "@/services/api";
import * as api from "@/services/api/api.client";

import { useAppleSignIn } from "./use-apple-sign-in.hook";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/services/api/api.client");
const mockShow = jest.fn();
jest.mock("@/providers/alert-message", () => ({
  AlertMessageProvider: ({ children }: { children: ReactNode }) => children,
  useAlertMessage: () => ({ show: mockShow }),
}));

const apiPost = jest.mocked(api.apiPost);
const signInAsync = jest.mocked(AppleAuthentication.signInAsync);
const show = mockShow;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
      })
    }
  >
    <AlertMessageProvider>{children}</AlertMessageProvider>
  </QueryClientProvider>
);

const credential = (
  identityToken: string | null = "id-token",
  fullName: { givenName: string | null; familyName: string | null } | null = {
    givenName: "Maria",
    familyName: "Silva",
  },
) =>
  ({
    user: "sub-1",
    identityToken,
    fullName,
  }) as AppleAuthentication.AppleAuthenticationCredential;

const SESSION = { accessToken: "a", user: { id: "1" } } as never;

const setup = async () => {
  const onSignedIn = jest.fn();
  const hook = await renderHook(() => useAppleSignIn({ onSignedIn }), {
    wrapper,
  });

  return { ...hook, onSignedIn };
};

const press = async (result: {
  current: { signInWithApple: () => Promise<void> };
}) => {
  await act(async () => {
    await result.current.signInWithApple();
  });
};

describe("useAppleSignIn", () => {
  beforeEach(() => {
    apiPost.mockReset();
    signInAsync.mockReset();
    show.mockClear();
    jest.mocked(router.push).mockClear();
  });

  it("signs in: asks Apple for the name and email, sends the token and the joined name, and hands the session over", async () => {
    signInAsync.mockResolvedValue(credential());
    apiPost.mockResolvedValue(SESSION);
    const { result, onSignedIn } = await setup();

    await press(result);

    expect(signInAsync).toHaveBeenCalledWith({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    expect(apiPost).toHaveBeenCalledWith("/auth/apple", {
      idToken: "id-token",
      name: "Maria Silva",
    });
    expect(onSignedIn).toHaveBeenCalledWith(SESSION);
    expect(show).not.toHaveBeenCalled();
  });

  it.each([
    [{ givenName: "Maria", familyName: null }, "Maria"],
    [{ givenName: null, familyName: "Silva" }, "Silva"],
  ])("sends the one name part Apple gave (%j)", async (fullName, name) => {
    signInAsync.mockResolvedValue(credential("id-token", fullName));
    apiPost.mockResolvedValue(SESSION);
    const { result } = await setup();

    await press(result);

    expect(apiPost).toHaveBeenCalledWith("/auth/apple", {
      idToken: "id-token",
      name,
    });
  });

  it.each([
    ["no full name", null],
    ["empty name parts", { givenName: null, familyName: null }],
    ["blank name parts", { givenName: "", familyName: "" }],
  ])("leaves out an empty name: %s", async (_, fullName) => {
    signInAsync.mockResolvedValue(credential("id-token", fullName));
    apiPost.mockResolvedValue(SESSION);
    const { result } = await setup();

    await press(result);

    const body = apiPost.mock.calls[0][1] as object;
    expect(JSON.parse(JSON.stringify(body))).toEqual({ idToken: "id-token" });
  });

  it("loading: is loading while the sign-in runs", async () => {
    let answer: (value: never) => void = () => {};
    signInAsync.mockResolvedValue(credential());
    apiPost.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve as never;
      }),
    );
    const { result } = await setup();

    await act(async () => {
      void result.current.signInWithApple();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    await act(async () => {
      answer(SESSION);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("ignores a second tap while one runs", async () => {
    let answer: (value: never) => void = () => {};
    signInAsync.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve as never;
      }),
    );
    apiPost.mockResolvedValue(SESSION);
    const { result } = await setup();

    await act(async () => {
      void result.current.signInWithApple();
      void result.current.signInWithApple();
    });
    await act(async () => {
      answer(credential() as never);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(signInAsync).toHaveBeenCalledTimes(1);
    expect(apiPost).toHaveBeenCalledTimes(1);
  });

  it('opens "Your name" with Apple\'s joined name when the backend asks for a name', async () => {
    signInAsync.mockResolvedValue(
      credential("id-token", { givenName: "Maria", familyName: null }),
    );
    apiPost.mockRejectedValue(new ApiError(422, ["user.name.fullName"]));
    const { result, onSignedIn } = await setup();

    await press(result);

    expect(router.push).toHaveBeenCalledWith(
      routes.auth.providerName({
        provider: "apple",
        idToken: "id-token",
        name: "Maria",
      }),
      { dangerouslySingular: true },
    );
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('opens "Your name" with an empty field when Apple gave no name', async () => {
    signInAsync.mockResolvedValue(credential("id-token", null));
    apiPost.mockRejectedValue(new ApiError(422, ["user.name.required"]));
    const { result } = await setup();

    await press(result);

    expect(router.push).toHaveBeenCalledWith(
      routes.auth.providerName({
        provider: "apple",
        idToken: "id-token",
        name: undefined,
      }),
      { dangerouslySingular: true },
    );
  });

  describe("errors", () => {
    it("shows nothing and calls no API when the sheet is closed", async () => {
      signInAsync.mockRejectedValue({ code: "ERR_REQUEST_CANCELED" });
      const { result, onSignedIn } = await setup();

      await press(result);

      expect(apiPost).not.toHaveBeenCalled();
      expect(show).not.toHaveBeenCalled();
      expect(onSignedIn).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it.each([
      ["no connection", new NetworkError(), "No connection"],
      [
        "an invalid token",
        new ApiError(401, ["auth.apple.tokenInvalid"]),
        "We couldn't sign you in with Apple. Try again.",
      ],
      [
        "an unverified email",
        new ApiError(401, ["auth.apple.emailNotVerified"]),
        "Your Apple email isn't verified. Use another sign-in method.",
      ],
      [
        "a missing email",
        new ApiError(401, ["auth.apple.emailMissing"]),
        "Apple didn't share your email. Use another sign-in method.",
      ],
      [
        "a validation error that isn't the name",
        new ApiError(422, ["idToken.token.required"]),
        "Something went wrong. Please try again.",
      ],
      [
        "a server error",
        new ApiError(500, []),
        "Something went wrong. Please try again.",
      ],
    ])("shows its message for %s", async (_, error, message) => {
      signInAsync.mockResolvedValue(credential());
      apiPost.mockRejectedValue(error);
      const { result } = await setup();

      await press(result);

      expect(show).toHaveBeenCalledWith(expect.stringContaining(message));
      expect(router.push).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("shows the generic message for a credential without an identity token", async () => {
      signInAsync.mockResolvedValue(credential(null));
      const { result } = await setup();

      await press(result);

      expect(apiPost).not.toHaveBeenCalled();
      expect(show).toHaveBeenCalledWith(
        "Something went wrong. Please try again.",
      );
      expect(result.current.isLoading).toBe(false);
    });

    it("shows the generic message for any other error from Apple", async () => {
      signInAsync.mockRejectedValue(new Error("boom"));
      const { result } = await setup();

      await press(result);

      expect(show).toHaveBeenCalledWith(
        "Something went wrong. Please try again.",
      );
    });
  });
});
