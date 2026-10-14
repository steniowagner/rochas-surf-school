import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../classes.test-utils";
import { LOCATIONS_QUERY_KEY } from "../utils/locations-cache";

import { useCreateLocation } from "./use-create-location.hook";

beforeEach(setupSignedInUser);

describe("useCreateLocation", () => {
  it("posts the location and adds it to the cached list in order", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(LOCATIONS_QUERY_KEY, {
      items: [
        { id: "l-1", name: "Água", address: "A" },
        { id: "l-2", name: "Zeta", address: "Z" },
      ],
    });
    const created = { id: "l-3", name: "Beta", address: "B" };
    fetchMock.mockResolvedValue({ ...ok(created), status: 201 });
    const { result } = await renderHook(() => useCreateLocation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "Beta", address: "B" });
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: JSON.stringify({ name: "Beta", address: "B" }),
    });
    expect(
      queryClient.getQueryData<{ items: { name: string }[] }>(LOCATIONS_QUERY_KEY)?.items.map((i) => i.name),
    ).toEqual(["Água", "Beta", "Zeta"]);
  });

  it("starts the list when none was loaded, and keeps equal names in id order", async () => {
    const queryClient = createQueryClient();
    fetchMock.mockResolvedValue({ ...ok({ id: "l-1", name: "Praia", address: "P" }), status: 201 });
    const { result } = await renderHook(() => useCreateLocation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: "Praia", address: "P" });
    });

    expect(queryClient.getQueryData(LOCATIONS_QUERY_KEY)).toEqual({
      items: [{ id: "l-1", name: "Praia", address: "P" }],
    });
  });

  it("leaves the cache alone and rejects on a failure", async () => {
    const queryClient = createQueryClient();
    fetchMock.mockResolvedValue(failure(500));
    const { result } = await renderHook(() => useCreateLocation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({ name: "x", address: "y" })).rejects.toBeDefined();
    });

    expect(queryClient.getQueryData(LOCATIONS_QUERY_KEY)).toBeUndefined();
  });
});
