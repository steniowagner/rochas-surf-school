import { act, renderHook } from "@testing-library/react-native";
import { reverseGeocodeAsync } from "expo-location";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";

import { useMapPlace } from "./use-map-place.hook";

const mockReverseGeocode = jest.mocked(reverseGeocodeAsync);
const onSelect = jest.fn();

const TAP = { latitude: -3.72, longitude: -38.51 };
const tap = (coordinate = TAP) => ({ nativeEvent: { coordinate } });
const poi = (placeId = "ChIJ-poi") => ({
  nativeEvent: { placeId, name: "Praia de Iracema", coordinate: TAP },
});

const place = {
  address: "Av. Beira Mar, 100 – Fortaleza",
  latitude: -3.7221,
  longitude: -38.5153,
  name: "Praia de Iracema",
};

// What the device's geocoder answers for a place; every field is there, most of them empty.
const geocoded = (fields: Record<string, string | null>) => ({
  city: null,
  district: null,
  streetNumber: null,
  street: null,
  region: null,
  subregion: null,
  country: null,
  postalCode: null,
  name: null,
  isoCountryCode: null,
  timezone: null,
  formattedAddress: null,
  ...fields,
});

// A response the test lets through when it is done looking at the lookup under way.
const hold = () => {
  let release: () => void = () => undefined;
  const response = new Promise((resolve) => {
    release = () => resolve(ok(place));
  });

  return { response, release };
};

const render = () =>
  renderHook(() => useMapPlace({ sessionToken: "tok-1", onSelect }), {
    wrapper: createWrapper(createQueryClient()),
  });

beforeEach(() => {
  setupSignedInUser();
  onSelect.mockReset();
  mockReverseGeocode.mockReset().mockResolvedValue([]);
});

describe("useMapPlace", () => {
  describe("a tap on the map", () => {
    it("selects the point with the address the device finds, and no name", async () => {
      mockReverseGeocode.mockResolvedValue([
        geocoded({
          street: "Av. Zezé Diogo",
          streetNumber: "5000",
          district: "Praia do Futuro",
          city: "Fortaleza",
          region: "CE",
        }),
      ] as never);
      const { result } = await render();

      await act(() => result.current.pressMap(tap()));

      expect(mockReverseGeocode).toHaveBeenCalledWith(TAP);
      expect(onSelect).toHaveBeenCalledWith({
        point: TAP,
        address: "Av. Zezé Diogo, 5000 – Praia do Futuro – Fortaleza – CE",
        name: null,
      });
      expect(result.current.resolving).toBe(false);
      expect(result.current.pendingPoint).toBeNull();
    });

    it("uses the device's own line when it gives one (Android)", async () => {
      mockReverseGeocode.mockResolvedValue([
        geocoded({
          formattedAddress: "Av. Zezé Diogo, 5000 - Fortaleza, CE",
          street: "ignored",
        }),
      ] as never);
      const { result } = await render();

      await act(() => result.current.pressMap(tap()));

      expect(onSelect.mock.calls[0][0].address).toBe(
        "Av. Zezé Diogo, 5000 - Fortaleza, CE",
      );
    });

    it("takes the subregion when there is no city", async () => {
      mockReverseGeocode.mockResolvedValue([
        geocoded({ street: "Rua A", subregion: "Caucaia" }),
      ] as never);
      const { result } = await render();

      await act(() => result.current.pressMap(tap()));

      expect(onSelect.mock.calls[0][0].address).toBe("Rua A – Caucaia");
    });

    it("cuts an address longer than the location's limit", async () => {
      mockReverseGeocode.mockResolvedValue([
        geocoded({ formattedAddress: "x".repeat(300) }),
      ] as never);
      const { result } = await render();

      await act(() => result.current.pressMap(tap()));

      expect(onSelect.mock.calls[0][0].address).toHaveLength(200);
    });

    it("puts the coordinates as the address when the device finds nothing", async () => {
      const { result } = await render();

      await act(() => result.current.pressMap(tap()));

      expect(onSelect).toHaveBeenCalledWith({
        point: TAP,
        address: "-3.7200, -38.5100",
        name: null,
      });
    });

    it("puts the coordinates as the address when the answer is empty", async () => {
      mockReverseGeocode.mockResolvedValue([geocoded({})] as never);
      const { result } = await render();

      await act(() => result.current.pressMap(tap()));

      expect(onSelect.mock.calls[0][0].address).toBe("-3.7200, -38.5100");
    });

    it("puts the coordinates as the address when the lookup fails", async () => {
      mockReverseGeocode.mockRejectedValue(new Error("offline"));
      const { result } = await render();

      await act(() => result.current.pressMap(tap()));

      expect(onSelect.mock.calls[0][0].address).toBe("-3.7200, -38.5100");
    });

    it("keeps the tapped point while the address is looked up", async () => {
      let answer: (value: never[]) => void = () => undefined;
      mockReverseGeocode.mockReturnValue(
        new Promise((resolve) => {
          answer = resolve;
        }),
      );
      const { result } = await render();

      let pressed: Promise<void> = Promise.resolve();
      await act(async () => {
        pressed = result.current.pressMap(tap());
      });

      expect(result.current.resolving).toBe(true);
      expect(result.current.pendingPoint).toEqual(TAP);
      expect(onSelect).not.toHaveBeenCalled();

      await act(async () => {
        answer([]);
        await pressed;
      });

      expect(result.current.resolving).toBe(false);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it("drops the answer of a tap a newer tap replaced", async () => {
      const answers: ((value: never[]) => void)[] = [];
      mockReverseGeocode.mockImplementation(
        () => new Promise((resolve) => answers.push(resolve)),
      );
      const { result } = await render();
      const second = { latitude: -3.8, longitude: -38.6 };

      let first: Promise<void> = Promise.resolve();
      let latest: Promise<void> = Promise.resolve();
      await act(async () => {
        first = result.current.pressMap(tap());
        latest = result.current.pressMap(tap(second));
      });
      await act(async () => {
        answers[1]([]);
        await latest;
        answers[0]([]);
        await first;
      });

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect.mock.calls[0][0].point).toEqual(second);
      expect(result.current.resolving).toBe(false);
    });
  });

  describe("a tap on a labelled place (Android)", () => {
    it("selects the place with Google's address, point and name, in the screen's session", async () => {
      fetchMock.mockResolvedValue(ok(place));
      const { result } = await render();

      await act(() => result.current.pressPoi(poi()));

      expect(requestedPaths()).toEqual([
        "/locations/address-suggestions/ChIJ-poi?sessionToken=tok-1&language=en",
      ]);
      expect(onSelect).toHaveBeenCalledWith({
        point: { latitude: -3.7221, longitude: -38.5153 },
        address: "Av. Beira Mar, 100 – Fortaleza",
        name: "Praia de Iracema",
      });
      expect(mockReverseGeocode).not.toHaveBeenCalled();
    });

    it("falls back to a tap on the point when Google can't answer", async () => {
      fetchMock.mockResolvedValue(failure(404));
      const { result } = await render();

      await act(() => result.current.pressPoi(poi()));

      expect(mockReverseGeocode).toHaveBeenCalledWith(TAP);
      expect(onSelect).toHaveBeenCalledWith({
        point: TAP,
        address: "-3.7200, -38.5100",
        name: null,
      });
    });

    it("moves the pin to the tapped place at once", async () => {
      const held = hold();
      fetchMock.mockReturnValue(held.response);
      const { result } = await render();

      let pressed: Promise<void> = Promise.resolve();
      await act(async () => {
        pressed = result.current.pressPoi(poi());
      });

      expect(result.current.pendingPoint).toEqual(TAP);

      await act(async () => {
        held.release();
        await pressed;
      });
    });
  });

  describe("a picked suggestion", () => {
    it("selects the place behind it, with its name", async () => {
      fetchMock.mockResolvedValue(ok({ ...place, address: "y".repeat(250) }));
      const { result } = await render();

      await act(() => result.current.pickPlace("ChIJ-sug"));

      expect(requestedPaths()).toEqual([
        "/locations/address-suggestions/ChIJ-sug?sessionToken=tok-1&language=en",
      ]);
      expect(onSelect).toHaveBeenCalledWith({
        point: { latitude: -3.7221, longitude: -38.5153 },
        address: "y".repeat(200),
        name: "Praia de Iracema",
      });
    });

    it("has no tapped point while the place is looked up", async () => {
      const held = hold();
      fetchMock.mockReturnValue(held.response);
      const { result } = await render();

      let picked: Promise<void> = Promise.resolve();
      await act(async () => {
        picked = result.current.pickPlace("ChIJ-sug");
      });

      expect(result.current.resolving).toBe(true);
      expect(result.current.pendingPoint).toBeNull();

      await act(async () => {
        held.release();
        await picked;
      });
    });

    it("selects nothing, without a toast, when the place can't be looked up", async () => {
      fetchMock.mockResolvedValue(failure(502));
      const { result } = await render();

      await act(() => result.current.pickPlace("ChIJ-sug"));

      expect(onSelect).not.toHaveBeenCalled();
      expect(result.current.resolving).toBe(false);
    });
  });
});
