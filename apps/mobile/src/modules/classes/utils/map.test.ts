import { Platform } from "react-native";

import {
  FORTALEZA,
  getDirectionsUrl,
  getMapProvider,
  MAP_DELTA,
  PREVIEW_DELTA,
  regionAround,
  toMapPoint,
} from "./map";

describe("regionAround", () => {
  it("centres on the point with the default span", () => {
    expect(regionAround({ latitude: -3.7442, longitude: -38.4617 })).toEqual({
      latitude: -3.7442,
      longitude: -38.4617,
      latitudeDelta: MAP_DELTA,
      longitudeDelta: MAP_DELTA,
    });
  });

  it("centres on Fortaleza when there is no point", () => {
    expect(regionAround(null)).toEqual({ ...FORTALEZA, latitudeDelta: 0.2, longitudeDelta: 0.2 });
    expect(FORTALEZA).toEqual({ latitude: -3.7319, longitude: -38.5267 });
  });
});

describe("getMapProvider", () => {
  const original = Platform.OS;

  afterEach(() => {
    Platform.OS = original;
  });

  it("is Google on Android and the default on iOS", () => {
    Platform.OS = "android";
    expect(getMapProvider()).toBe("google");

    Platform.OS = "ios";
    expect(getMapProvider()).toBeUndefined();
  });
});

describe("toMapPoint", () => {
  it("reads a point, or none when either coordinate is missing", () => {
    expect(toMapPoint({ latitude: 1, longitude: 2 })).toEqual({ latitude: 1, longitude: 2 });
    expect(toMapPoint({ latitude: null, longitude: 2 })).toBeNull();
    expect(toMapPoint({ latitude: 1, longitude: null })).toBeNull();
  });
});

describe("regionAround (preview)", () => {
  it("takes the span it is given", () => {
    expect(regionAround({ latitude: 1, longitude: 2 }, PREVIEW_DELTA)).toEqual({
      latitude: 1,
      longitude: 2,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  });
});

describe("getDirectionsUrl", () => {
  const original = Platform.OS;

  afterEach(() => {
    Platform.OS = original;
  });

  it("opens Apple Maps on iOS and Google Maps on Android", () => {
    const point = { latitude: -3.7442, longitude: -38.4617 };

    Platform.OS = "ios";
    expect(getDirectionsUrl(point)).toBe("https://maps.apple.com/?daddr=-3.7442,-38.4617");

    Platform.OS = "android";
    expect(getDirectionsUrl(point)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-3.7442,-38.4617",
    );
  });
});
