import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

import { SessionProvider } from "@/providers/session";
import * as api from "@/services/api/api.client";
import { SessionExpiredError } from "@/services/api";

import { useUpdateName } from "./use-update-name.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));
jest.mock("@/services/api/api.client");

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <SessionProvider>{children}</SessionProvider>
  </QueryClientProvider>
);

describe("useUpdateName", () => {
  beforeEach(() => mockShow.mockReset());

  it("shows nothing when the session expired (handled once for the whole app)", async () => {
    jest.mocked(api.apiPut).mockRejectedValue(new SessionExpiredError());
    const { result } = await renderHook(() => useUpdateName(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: "Ana Clara" }).catch(() => {});
    });

    expect(mockShow).not.toHaveBeenCalled();
  });
});
