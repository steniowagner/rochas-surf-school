import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import { ReactNode } from "react";

import { SessionProvider } from "@/providers/session";
import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";
import * as api from "@/services/api/api.client";

import { useDeleteAccount } from "./use-delete-account.hook";

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

const run = async (error: unknown) => {
  jest.mocked(api.apiDelete).mockRejectedValue(error);
  const { result } = await renderHook(() => useDeleteAccount(), { wrapper });

  await act(async () => {
    await result.current.mutateAsync().catch(() => {});
  });
};

describe("useDeleteAccount", () => {
  beforeEach(() => mockShow.mockReset());

  it("shows nothing when the session expired", async () => {
    await run(new SessionExpiredError());

    expect(mockShow).not.toHaveBeenCalled();
  });

  it("shows nothing when the backend refuses the only admin: the sheet says so", async () => {
    await run(new ApiError(409, ["user.role.lastAdmin"]));

    expect(mockShow).not.toHaveBeenCalled();
  });

  it("shows the no-connection toast", async () => {
    await run(new NetworkError());

    expect(mockShow).toHaveBeenCalledWith(
      "No connection. Check your internet and try again.",
    );
  });

  it("shows the generic toast for any other error", async () => {
    await run(new Error("boom"));

    expect(mockShow).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
    );
  });
});
