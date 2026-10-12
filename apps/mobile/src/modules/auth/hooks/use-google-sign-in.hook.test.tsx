import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { ReactNode } from "react";
import { Platform } from "react-native";

import { routes } from "@/constants/routes";
import { AlertMessageProvider } from "@/providers/alert-message";
import { ApiError, NetworkError } from "@/services/api";
import * as api from "@/services/api/api.client";

import { useGoogleSignIn } from "./use-google-sign-in.hook";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/services/api/api.client");
const mockShow = jest.fn();
jest.mock("@/providers/alert-message", () => ({
  AlertMessageProvider: ({ children }: { children: ReactNode }) => children,
  useAlertMessage: () => ({ show: mockShow }),
}));

const apiPost = jest.mocked(api.apiPost);
const signIn = jest.mocked(GoogleSignin.signIn);
const hasPlayServices = jest.mocked(GoogleSignin.hasPlayServices);
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

const picked = (
  idToken: string | null = "id-token",
  name: string | null = "Maria",
) => ({ type: "success", data: { idToken, user: { name } } }) as never;

const SESSION = { accessToken: "a", user: { id: "1" } } as never;

const setup = async () => {
  const onSignedIn = jest.fn();
  const hook = await renderHook(() => useGoogleSignIn({ onSignedIn }), {
    wrapper,
  });

  return { ...hook, onSignedIn };
};

const press = async (result: {
  current: { signInWithGoogle: () => Promise<void> };
}) => {
  await act(async () => {
    await result.current.signInWithGoogle();
  });
};

const originalOS = Platform.OS;

beforeEach(() => {
  apiPost.mockReset();
  signIn.mockReset();
  hasPlayServices.mockClear();
  show.mockClear();
  jest.mocked(router.push).mockClear();
  Platform.OS = "ios";
});

afterEach(() => {
  Platform.OS = originalOS;
});

describe("useGoogleSignIn", () => {
  it("signs in: sends the ID token and hands the session over", async () => {
    signIn.mockResolvedValue(picked());
    apiPost.mockResolvedValue(SESSION);
    const { result, onSignedIn } = await setup();

    await press(result);

    expect(apiPost).toHaveBeenCalledWith("/auth/google", {
      idToken: "id-token",
    });
    expect(onSignedIn).toHaveBeenCalledWith(SESSION);
    expect(show).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("checks Google Play services before signing in, on Android only", async () => {
    signIn.mockResolvedValue(picked());
    apiPost.mockResolvedValue(SESSION);
    const { result } = await setup();

    await press(result);
    expect(hasPlayServices).not.toHaveBeenCalled();

    Platform.OS = "android";
    await press(result);
    expect(hasPlayServices).toHaveBeenCalledTimes(1);
  });

  it("loading: is loading while the sign-in runs", async () => {
    let finish: (value: never) => void = () => {};
    signIn.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    apiPost.mockResolvedValue(SESSION);
    const { result } = await setup();

    let running: Promise<void> = Promise.resolve();
    await act(async () => {
      running = result.current.signInWithGoogle();
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      finish(picked());
      await running;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("ignores a second tap while one runs", async () => {
    let finish: (value: never) => void = () => {};
    signIn.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    apiPost.mockResolvedValue(SESSION);
    const { result } = await setup();

    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = result.current.signInWithGoogle();
      await result.current.signInWithGoogle();
    });
    await act(async () => {
      finish(picked());
      await first;
    });

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(apiPost).toHaveBeenCalledTimes(1);
  });

  it("opens Your name with Google's name when the backend asks for a name", async () => {
    signIn.mockResolvedValue(picked("id-token", "Maria"));
    apiPost.mockRejectedValue(new ApiError(422, ["user.name.min.length"]));
    const { result, onSignedIn } = await setup();

    await press(result);

    expect(router.push).toHaveBeenCalledWith(
      routes.auth.googleName({ idToken: "id-token", name: "Maria" }),
    );
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it("opens Your name without a name when Google gave none", async () => {
    signIn.mockResolvedValue(picked("id-token", null));
    apiPost.mockRejectedValue(new ApiError(422, ["user.name.required"]));
    const { result } = await setup();

    await press(result);

    expect(router.push).toHaveBeenCalledWith(
      routes.auth.googleName({ idToken: "id-token", name: undefined }),
    );
  });

  describe("errors", () => {
    it("shows nothing and calls no API when the picker is closed", async () => {
      signIn.mockResolvedValue({ type: "cancelled", data: null } as never);
      const { result } = await setup();

      await press(result);

      expect(apiPost).not.toHaveBeenCalled();
      expect(show).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it.each(["SIGN_IN_CANCELLED", "IN_PROGRESS"])(
      "shows nothing for %s",
      async (code) => {
        signIn.mockRejectedValue({ code });
        const { result } = await setup();

        await press(result);

        expect(apiPost).not.toHaveBeenCalled();
        expect(show).not.toHaveBeenCalled();
        expect(result.current.isLoading).toBe(false);
      },
    );

    it.each([
      [
        "Play services unavailable",
        () => signIn.mockRejectedValue({ code: "PLAY_SERVICES_NOT_AVAILABLE" }),
        "Google Play services is unavailable on this phone.",
      ],
      [
        "no connection",
        () => {
          signIn.mockResolvedValue(picked());
          apiPost.mockRejectedValue(new NetworkError());
        },
        "No connection. Check your internet and try again.",
      ],
      [
        "an invalid token",
        () => {
          signIn.mockResolvedValue(picked());
          apiPost.mockRejectedValue(
            new ApiError(401, ["auth.google.tokenInvalid"]),
          );
        },
        "We couldn't sign you in with Google. Try again.",
      ],
      [
        "an unverified email",
        () => {
          signIn.mockResolvedValue(picked());
          apiPost.mockRejectedValue(
            new ApiError(401, ["auth.google.emailNotVerified"]),
          );
        },
        "Your Google email isn't verified. Use another sign-in method.",
      ],
      [
        "a server error",
        () => {
          signIn.mockResolvedValue(picked());
          apiPost.mockRejectedValue(new ApiError(500, []));
        },
        "Something went wrong. Please try again.",
      ],
      [
        "a token-less answer",
        () => signIn.mockResolvedValue(picked(null)),
        "Something went wrong. Please try again.",
      ],
      [
        "a 422 that is not about the name",
        () => {
          signIn.mockResolvedValue(picked());
          apiPost.mockRejectedValue(
            new ApiError(422, ["idToken.token.required"]),
          );
        },
        "Something went wrong. Please try again.",
      ],
    ])("shows the message for %s", async (_, arrange, message) => {
      arrange();
      const { result, onSignedIn } = await setup();

      await press(result);

      await waitFor(() => expect(show).toHaveBeenCalledWith(message));
      expect(onSignedIn).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
