import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import { useCancelSeat } from "./use-cancel-seat.hook";

beforeEach(setupSignedInUser);

const cancelled = { id: "e-1", classId: "c-1", status: "cancelled", requestedAt: "2026-10-14T13:00:00.000Z" };

describe("useCancelSeat", () => {
  it("posts the cancellation without a body, authenticated, and answers the enrolment", async () => {
    fetchMock.mockResolvedValue(ok(cancelled));
    const { result } = await renderHook(() => useCancelSeat(), {
      wrapper: createWrapper(createQueryClient()),
    });

    let out;
    await act(async () => {
      out = await result.current.mutateAsync("e-1");
    });

    expect(out).toEqual(cancelled);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/enrolments/e-1/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
    });
  });

  it("invalidates every cached week and detail on success", async () => {
    fetchMock.mockResolvedValue(ok(cancelled));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    const { result } = await renderHook(() => useCancelSeat(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("e-1");
    });

    expect(queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated).toBe(true);
  });

  it("invalidates nothing and does not retry when the cancellation fails", async () => {
    fetchMock.mockResolvedValue(failure(409));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    const { result } = await renderHook(() => useCancelSeat(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync("e-1").catch(() => undefined);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated).toBe(false);
  });
});
