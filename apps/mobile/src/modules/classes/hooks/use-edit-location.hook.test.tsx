import { act, renderHook } from "@testing-library/react-native";

import {
  buildLocation,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../classes.test-utils";
import { LOCATIONS_QUERY_KEY } from "../utils/locations-cache";

import { useEditLocation } from "./use-edit-location.hook";

beforeEach(setupSignedInUser);

const variables = {
  id: "l-1",
  name: "Zeta",
  address: "Rua Nova",
  latitude: -3.8,
  longitude: -38.6,
  notify: true,
};

describe("useEditLocation", () => {
  it("puts the whole location and replaces its row in the cached list", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(LOCATIONS_QUERY_KEY, {
      items: [
        buildLocation({ id: "l-1", name: "Água" }),
        buildLocation({ id: "l-2", name: "Beta" }),
      ],
    });
    const edited = buildLocation({
      id: "l-1",
      name: "Zeta",
      address: "Rua Nova",
      latitude: -3.8,
      longitude: -38.6,
    });
    fetchMock.mockResolvedValue(ok(edited));
    const { result } = await renderHook(() => useEditLocation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/locations/l-1", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer at-1",
      },
      body: JSON.stringify({
        name: "Zeta",
        address: "Rua Nova",
        latitude: -3.8,
        longitude: -38.6,
        notify: true,
      }),
    });
    expect(
      queryClient
        .getQueryData<{ items: { id: string; name: string }[] }>(
          LOCATIONS_QUERY_KEY,
        )
        ?.items.map((i) => i.name),
    ).toEqual(["Beta", "Zeta"]);
  });

  it("reloads the cached classes, so their weeks and details show the edited location", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "week", "2026-10-19"], { items: [] });
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    fetchMock.mockResolvedValue(ok(buildLocation({ id: "l-1", name: "Zeta" })));
    const { result } = await renderHook(() => useEditLocation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(
      queryClient.getQueryState(["classes", "week", "2026-10-19"])
        ?.isInvalidated,
    ).toBe(true);
    expect(
      queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated,
    ).toBe(true);
  });

  it("leaves the cache alone, and does not retry, on a failure", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(["classes", "detail", "c-1"], { id: "c-1" });
    fetchMock.mockResolvedValue(failure(500));
    const { result } = await renderHook(() => useEditLocation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await expect(result.current.mutateAsync(variables)).rejects.toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryData(LOCATIONS_QUERY_KEY)).toBeUndefined();
    expect(
      queryClient.getQueryState(["classes", "detail", "c-1"])?.isInvalidated,
    ).toBe(false);
  });
});
