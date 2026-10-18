import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../classes.test-utils";

import { useAddressPlace } from "./use-address-place.hook";

beforeEach(setupSignedInUser);

const place = { address: "Av. Zezé Diogo, 5000", latitude: -3.7442, longitude: -38.4617, name: "Praia do Futuro" };

describe("useAddressPlace", () => {
  it("gets the place behind a suggestion in the session of the suggestions", async () => {
    fetchMock.mockResolvedValue(ok(place));
    const { result } = await renderHook(() => useAddressPlace("tok-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    let found: unknown;
    await act(async () => {
      found = await result.current.mutateAsync("ChIJ/abc");
    });

    expect(found).toEqual(place);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/locations/address-suggestions/ChIJ%2Fabc?sessionToken=tok-1&language=en",
      { method: "GET", headers: { Authorization: "Bearer at-1" } },
    );
  });

  it("rejects on a failure, without retrying", async () => {
    fetchMock.mockResolvedValue(failure(404));
    const { result } = await renderHook(() => useAddressPlace("tok-1"), {
      wrapper: createWrapper(createQueryClient()),
    });

    await act(async () => {
      await expect(result.current.mutateAsync("x")).rejects.toBeDefined();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
