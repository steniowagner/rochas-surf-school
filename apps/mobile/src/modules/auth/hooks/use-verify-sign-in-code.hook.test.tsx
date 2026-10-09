import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import { ApiError } from "@/services/api";
import * as api from "@/services/api/api.client";

import { useVerifySignInCode } from "./use-verify-sign-in-code.hook";

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

const variables = {
  email: "ana.silva@gmail.com",
  code: "123456",
  name: "Ana Silva",
};

describe("useVerifySignInCode", () => {
  beforeEach(() => {
    apiPost.mockReset();
  });

  it("sends the code to verify and returns the response", async () => {
    const response = { accessToken: "a" };
    apiPost.mockResolvedValue(response);
    const { result } = await renderHook(() => useVerifySignInCode(), {
      wrapper,
    });

    result.current.mutate(variables);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiPost).toHaveBeenCalledWith("/auth/email/verify", variables);
    expect(result.current.data).toBe(response);
  });

  it("exposes the error", async () => {
    apiPost.mockRejectedValue(new ApiError(401, ["signInCode.code.invalid"]));
    const { result } = await renderHook(() => useVerifySignInCode(), {
      wrapper,
    });

    result.current.mutate(variables);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
