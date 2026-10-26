import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../classes.test-utils";

import { useCancelClass } from "./use-cancel-class.hook";

beforeEach(setupSignedInUser);

describe("useCancelClass", () => {
  it("posts the cancellation, authenticated, and answers the class", async () => {
    fetchMock.mockResolvedValue(ok({ id: "c-1" }));
    const { result } = await renderHook(() => useCancelClass("c-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    let out;
    await act(async () => {
      out = await result.current.mutateAsync({ message: "Mar muito grande." });
    });

    expect(out).toEqual({ id: "c-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/classes/c-1/cancel",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer at-1",
        },
        body: JSON.stringify({ message: "Mar muito grande." }),
      },
    );
  });

  it("invalidates every cached week and detail on success", async () => {
    fetchMock.mockResolvedValue(ok({ id: "c-1" }));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "week", "2026-10-12"], {
      weekStart: "2026-10-12",
      items: [],
    });
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    queryClient.setQueryData(["locations"], { items: [] });
    const { result } = await renderHook(() => useCancelClass("c-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(
      queryClient.getQueryState(["classes", "week", "2026-10-12"])
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryState(["locations"])?.isInvalidated).toBe(false);
  });

  it("invalidates nothing and does not retry when cancelling fails", async () => {
    fetchMock.mockResolvedValue(failure(409));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    const { result } = await renderHook(() => useCancelClass("c-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated,
    ).toBe(false);
  });
});
