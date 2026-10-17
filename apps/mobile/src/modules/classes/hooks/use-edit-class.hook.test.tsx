import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../classes.test-utils";
import { EditClassRequest } from "../classes.types";

import { useEditClass } from "./use-edit-class.hook";

beforeEach(setupSignedInUser);

const request: EditClassRequest = {
  discipline: "surf",
  level: "beginner",
  date: "2026-10-16",
  start: "08:00",
  end: "09:00",
  locationId: "l-1",
  instructorIds: ["t-1"],
  capacity: 8,
};

describe("useEditClass", () => {
  it("puts the class, authenticated, and answers the updated class", async () => {
    fetchMock.mockResolvedValue(ok({ id: "c-1" }));
    const { result } = await renderHook(() => useEditClass("c-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    let out;
    await act(async () => {
      out = await result.current.mutateAsync(request);
    });

    expect(out).toEqual({ id: "c-1" });
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/classes/c-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: JSON.stringify(request),
    });
  });

  it("invalidates the cached weeks and the details of the class, and nothing else", async () => {
    fetchMock.mockResolvedValue(ok({ id: "c-1" }));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "week", "2026-10-12"], { weekStart: "2026-10-12", items: [] });
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    queryClient.setQueryData(["classes", "detail", "c-2"], { id: "c-2" });
    const { result } = await renderHook(() => useEditClass("c-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(request);
    });

    expect(queryClient.getQueryState(["classes", "week", "2026-10-12"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["classes", "detail", "c-2"])?.isInvalidated).toBe(false);
  });

  it("invalidates nothing and does not retry when saving fails", async () => {
    fetchMock.mockResolvedValue(failure(409));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    const { result } = await renderHook(() => useEditClass("c-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(request)).rejects.toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated).toBe(false);
  });
});
