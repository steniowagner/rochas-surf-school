import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import i18n from "@/i18n";
import { ApiError } from "@/services/api";
import * as api from "@/services/api/api.client";

import { useRequestSignInCode } from "./use-request-sign-in-code.hook";

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

describe("useRequestSignInCode", () => {
  beforeEach(() => {
    apiPost.mockReset();
  });

  it("sends email and locale", async () => {
    apiPost.mockResolvedValue({});
    const { result } = await renderHook(() => useRequestSignInCode(), {
      wrapper,
    });

    result.current.mutate({ email: "ana@gmail.com" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiPost).toHaveBeenCalledWith("/auth/email/code", {
      email: "ana@gmail.com",
      locale: "en",
    });
  });

  it.each([
    ["en-US", "en"],
    ["es-ES", "es"],
    ["pt-BR", "pt-BR"],
  ])(
    "maps the app language %s to the backend locale %s",
    async (language, locale) => {
      await i18n.changeLanguage(language);
      apiPost.mockResolvedValue({});
      const { result } = await renderHook(() => useRequestSignInCode(), {
        wrapper,
      });

      result.current.mutate({ email: "ana@gmail.com" });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(apiPost).toHaveBeenCalledWith("/auth/email/code", {
        email: "ana@gmail.com",
        locale,
      });
    },
  );

  it("treats resend too soon as success", async () => {
    apiPost.mockRejectedValue(new ApiError(429, ["signInCode.resend.tooSoon"]));
    const { result } = await renderHook(() => useRequestSignInCode(), {
      wrapper,
    });

    result.current.mutate({ email: "ana@gmail.com" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rejects on other errors", async () => {
    const error = new ApiError(502, ["signInCode.email.sendFailed"]);
    apiPost.mockRejectedValue(error);
    const { result } = await renderHook(() => useRequestSignInCode(), {
      wrapper,
    });

    result.current.mutate({ email: "ana@gmail.com" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(error);
  });
});
