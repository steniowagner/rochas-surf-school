import { renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import { SessionProvider } from "@/providers/session";

import {
  createQueryClient,
  createWrapper,
  fetchMock,
  ok,
  setupSignedInAdmin,
  setupSignedInUser,
} from "../people.test-utils";

import { useRemovedAccounts } from "./use-removed-accounts.hook";

const createWrapperWithSession = () => {
  const QueryWrapper = createWrapper(createQueryClient());

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryWrapper>
        <SessionProvider>{children}</SessionProvider>
      </QueryWrapper>
    );
  };
};

const ITEMS = [{ id: "p-1", name: "Ana", role: "student", removedAt: "2026-10-02T15:00:00.000Z" }];

describe("useRemovedAccounts", () => {
  it("asks an approved admin for the removed accounts", async () => {
    setupSignedInAdmin();
    fetchMock.mockResolvedValue(ok({ items: ITEMS }));
    const { result } = await renderHook(() => useRemovedAccounts(), {
      wrapper: createWrapperWithSession(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ items: ITEMS });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/people/removed",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer at-1" }) }),
    );
  });

  it("never asks anyone else", async () => {
    setupSignedInUser();
    const { result } = await renderHook(() => useRemovedAccounts(), {
      wrapper: createWrapperWithSession(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
