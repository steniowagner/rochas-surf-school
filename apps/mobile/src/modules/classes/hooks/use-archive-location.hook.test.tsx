import { act, renderHook } from "@testing-library/react-native";

import {
  buildLocation,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  setupSignedInUser,
} from "../classes.test-utils";
import { LOCATIONS_QUERY_KEY } from "../utils/locations-cache";

import { useArchiveLocation } from "./use-archive-location.hook";

beforeEach(setupSignedInUser);

describe("useArchiveLocation", () => {
  it("posts the archive and drops the location from the cached list", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(LOCATIONS_QUERY_KEY, {
      items: [buildLocation({ id: "l-1" }), buildLocation({ id: "l-2", name: "Beta" })],
    });
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => undefined });
    const { result } = await renderHook(() => useArchiveLocation(), { wrapper: createWrapper(queryClient) });

    await act(async () => {
      await result.current.mutateAsync("l-1");
    });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/locations/l-1/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
    });
    expect(
      queryClient.getQueryData<{ items: { id: string }[] }>(LOCATIONS_QUERY_KEY)?.items.map((i) => i.id),
    ).toEqual(["l-2"]);
  });

  it("keeps the list on a failure", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(LOCATIONS_QUERY_KEY, { items: [buildLocation()] });
    fetchMock.mockResolvedValue(failure(409));
    const { result } = await renderHook(() => useArchiveLocation(), { wrapper: createWrapper(queryClient) });

    await act(async () => {
      await expect(result.current.mutateAsync("l-1")).rejects.toBeDefined();
    });

    expect(queryClient.getQueryData<{ items: unknown[] }>(LOCATIONS_QUERY_KEY)?.items).toHaveLength(1);
  });
});
