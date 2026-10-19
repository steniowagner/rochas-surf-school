import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import { useRequestSeat } from "./use-request-seat.hook";

beforeEach(setupSignedInUser);

const created = { id: "e-1", classId: "c-1", status: "pending", requestedAt: "2026-10-14T13:00:00.000Z" };

describe("useRequestSeat", () => {
  it("posts the acceptance, authenticated, and answers the enrolment", async () => {
    fetchMock.mockResolvedValue(ok(created));
    const { result } = await renderHook(() => useRequestSeat("c-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    let out;
    await act(async () => {
      out = await result.current.mutateAsync({ acceptCancellationRule: true });
    });

    expect(out).toEqual(created);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/classes/c-1/enrolments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: JSON.stringify({ acceptCancellationRule: true }),
    });
  });

  it("invalidates every cached week and detail on success", async () => {
    fetchMock.mockResolvedValue(ok(created));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "week", "2026-10-12"], { weekStart: "2026-10-12", items: [] });
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    queryClient.setQueryData(["locations"], { items: [] });
    const { result } = await renderHook(() => useRequestSeat("c-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ acceptCancellationRule: true });
    });

    expect(queryClient.getQueryState(["classes", "week", "2026-10-12"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["locations"])?.isInvalidated).toBe(false);
  });

  it("invalidates nothing and does not retry when the request fails", async () => {
    fetchMock.mockResolvedValue(failure(409));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    const { result } = await renderHook(() => useRequestSeat("c-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({ acceptCancellationRule: true })).rejects.toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated).toBe(false);
  });
});
