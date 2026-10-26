import { renderHook, waitFor } from "@testing-library/react-native";

import {
  buildLocation,
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";

import { useLocations } from "./use-locations.hook";

beforeEach(setupSignedInUser);

describe("useLocations", () => {
  it("loads the locations, authenticated", async () => {
    const items = [
      buildLocation({
        name: "Praia",
        address: "Av. Beira Mar",
        upcomingClasses: 2,
      }),
    ];
    fetchMock.mockResolvedValue(ok({ items }));

    const { result } = await renderHook(() => useLocations(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual({ items }));
    expect(requestedPaths()).toEqual(["/locations"]);
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/locations", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("does not retry a failure", async () => {
    fetchMock.mockResolvedValue(failure());

    const { result } = await renderHook(() => useLocations(), {
      wrapper: createWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
