import { act, renderHook } from "@testing-library/react-native";

import { ApiError } from "@/services/api";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../people.test-utils";

import { useRestoreAccount } from "./use-restore-account.hook";

beforeEach(setupSignedInUser);

describe("useRestoreAccount", () => {
  it("posts the restore and reloads the removed accounts and the people", async () => {
    const queryClient = createQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(ok({ id: "p-1", status: "approved" }));
    const { result } = await renderHook(() => useRestoreAccount(), {
      wrapper: createWrapper(queryClient),
    });

    let answer: unknown;
    await act(async () => {
      answer = await result.current.mutateAsync("p-1");
    });

    expect(answer).toEqual({ id: "p-1", status: "approved" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/people/p-1/restore",
      expect.objectContaining({ method: "POST" }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["removed-accounts"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["people"] });
  });

  it("fails without retrying and without reloading anything", async () => {
    const queryClient = createQueryClient();
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    fetchMock.mockResolvedValue(failure(409));
    const { result } = await renderHook(() => useRestoreAccount(), {
      wrapper: createWrapper(queryClient),
    });

    let error: unknown;
    await act(async () => {
      error = await result.current.mutateAsync("p-1").catch((caught) => caught);
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
