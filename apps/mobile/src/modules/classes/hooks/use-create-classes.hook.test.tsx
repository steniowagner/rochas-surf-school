import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../classes.test-utils";
import { BatchRequest } from "../classes.types";

import { useCreateClasses } from "./use-create-classes.hook";

beforeEach(setupSignedInUser);

const request: BatchRequest = {
  discipline: "surf",
  level: "beginner",
  startDate: "2026-10-15",
  endDate: "2026-10-16",
  weekdays: [1, 2, 3, 4, 5, 6, 7],
  timeRanges: [{ start: "08:00", end: "09:00" }],
  locationId: "l-1",
  instructorIds: ["t-1"],
  capacity: 8,
};

describe("useCreateClasses", () => {
  it("posts the batch, authenticated, and answers the count", async () => {
    fetchMock.mockResolvedValue({ ...ok({ count: 2 }), status: 201 });
    const { result } = await renderHook(() => useCreateClasses(), {
      wrapper: createWrapper(createQueryClient()),
    });

    let out;
    await act(async () => {
      out = await result.current.mutateAsync(request);
    });

    expect(out).toEqual({ count: 2 });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/classes/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: JSON.stringify(request),
    });
  });

  it("invalidates the cached weeks after creating", async () => {
    fetchMock.mockResolvedValue({ ...ok({ count: 2 }), status: 201 });
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "week", "2026-10-12"], { weekStart: "2026-10-12", items: [] });
    queryClient.setQueryData(["classes", "time-range-suggestions"], { items: [] });
    const { result } = await renderHook(() => useCreateClasses(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(request);
    });

    expect(queryClient.getQueryState(["classes", "week", "2026-10-12"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["classes", "time-range-suggestions"])?.isInvalidated).toBe(false);
  });

  it("invalidates nothing when creating fails", async () => {
    fetchMock.mockResolvedValue(failure(422));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "week", "2026-10-12"], { weekStart: "2026-10-12", items: [] });
    const { result } = await renderHook(() => useCreateClasses(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(request)).rejects.toBeDefined();
    });

    expect(queryClient.getQueryState(["classes", "week", "2026-10-12"])?.isInvalidated).toBe(false);
  });

  it("rejects on a failure, once", async () => {
    fetchMock.mockResolvedValue(failure(422));
    const { result } = await renderHook(() => useCreateClasses(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(request)).rejects.toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
