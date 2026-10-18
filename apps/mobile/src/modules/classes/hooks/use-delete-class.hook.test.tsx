import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  setupSignedInUser,
} from "../classes.test-utils";

import { useDeleteClass } from "./use-delete-class.hook";

beforeEach(setupSignedInUser);

const noContent = () => ({ ok: true, status: 204, json: async () => undefined }) as unknown as Response;

describe("useDeleteClass", () => {
  it("sends the delete, authenticated and without a body", async () => {
    fetchMock.mockResolvedValue(noContent());
    const { result } = await renderHook(() => useDeleteClass("c-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/classes/c-1", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: undefined,
    });
  });

  it("removes the class details and invalidates the weeks on success", async () => {
    fetchMock.mockResolvedValue(noContent());
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "week", "2026-10-12"], { weekStart: "2026-10-12", items: [] });
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    queryClient.setQueryData(["classes", "detail", "c-2"], { id: "c-2" });
    const { result } = await renderHook(() => useDeleteClass("c-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(queryClient.getQueryState(["classes", "week", "2026-10-12"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryData(["classes", "detail", "c-1"])).toBeUndefined();
    expect(queryClient.getQueryData(["classes", "detail", "c-2"])).toEqual({ id: "c-2" });
  });

  it("keeps the cache and does not retry when deleting fails", async () => {
    fetchMock.mockResolvedValue(failure(409));
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    queryClient.setQueryData(["classes", "week", "2026-10-12"], { items: [] });
    const { result } = await renderHook(() => useDeleteClass("c-1"), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(["classes", "detail", "c-1"])).toEqual({ id: "c-1" });
    expect(queryClient.getQueryState(["classes", "week", "2026-10-12"])?.isInvalidated).toBe(false);
  });
});
