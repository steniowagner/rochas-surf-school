import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import { ApiError } from "@/services/api";
import * as api from "@/services/api/api.client";

import { useSignInWithApple } from "./use-sign-in-with-apple.hook";

jest.mock("@/services/api/api.client");

const apiPost = jest.mocked(api.apiPost);

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
      })
    }
  >
    {children}
  </QueryClientProvider>
);

describe("useSignInWithApple", () => {
  beforeEach(() => {
    apiPost.mockReset();
  });

  it("sends the ID token and the name to /auth/apple and returns the response", async () => {
    const response = { accessToken: "a" };
    apiPost.mockResolvedValue(response);
    const { result } = await renderHook(() => useSignInWithApple(), {
      wrapper,
    });

    result.current.mutate({ idToken: "token", name: "Maria Souza" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiPost).toHaveBeenCalledWith("/auth/apple", {
      idToken: "token",
      name: "Maria Souza",
    });
    expect(result.current.data).toBe(response);
  });

  it("exposes the error", async () => {
    apiPost.mockRejectedValue(new ApiError(401, ["auth.apple.tokenInvalid"]));
    const { result } = await renderHook(() => useSignInWithApple(), {
      wrapper,
    });

    result.current.mutate({ idToken: "token" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});
