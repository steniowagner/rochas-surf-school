import { ValidationException } from "@rochas-surf-school/shared";
import {
  Location,
  LOCATION_ADDRESS_MAX,
  LOCATION_NAME_MAX,
  normalizeLocationName,
} from "../../../src";

function errorsOf(action: () => void): string[] {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationException);
    return (error as ValidationException).errors.map((item) => item.message);
  }
  throw new Error("expected a ValidationException");
}

describe("Location", () => {
  it("trims the name and the address and derives the name key", () => {
    const location = new Location({
      name: "  Praia do Futuro ",
      address: " Av. Zezé Diogo, 5000 ",
      latitude: -3.7442,
      longitude: -38.4617,
    });

    expect(location.name).toBe("Praia do Futuro");
    expect(location.address).toBe("Av. Zezé Diogo, 5000");
    expect(location.nameKey).toBe("praia do futuro");
    expect(() => location.validate()).not.toThrow();
  });

  it("accepts the maximum lengths", () => {
    const location = new Location({
      name: "a".repeat(LOCATION_NAME_MAX),
      address: "b".repeat(LOCATION_ADDRESS_MAX),
      latitude: 90,
      longitude: -180,
    });

    expect(() => location.validate()).not.toThrow();
  });

  it.each([
    [{ name: "", address: "x" }, ["location.name.required"]],
    [{ name: "   ", address: "x" }, ["location.name.required"]],
    [{ name: "a".repeat(41), address: "x" }, ["location.name.max.length"]],
    [{ name: "x", address: "" }, ["location.address.required"]],
    [{ name: "x", address: "b".repeat(201) }, ["location.address.max.length"]],
    [
      { name: "", address: "" },
      ["location.name.required", "location.address.required"],
    ],
  ])("refuses %j", (state, keys) => {
    const point = { latitude: -3.7, longitude: -38.5 };

    expect(errorsOf(() => new Location({ ...point, ...state }).validate())).toEqual(keys);
  });

  it("reads the point and the archive state", () => {
    const archivedAt = new Date("2026-10-01T10:00:00.000Z");
    const location = new Location({ name: "x", address: "y", latitude: 1, longitude: 2, archivedAt });

    expect([location.latitude, location.longitude]).toEqual([1, 2]);
    expect(location.isArchived).toBe(true);
    expect(location.archivedAt).toEqual(archivedAt);
    expect(location.archivedAt).not.toBe(archivedAt);

    const active = new Location({ name: "x", address: "y" });
    expect([active.latitude, active.longitude, active.archivedAt, active.isArchived]).toEqual([
      null,
      null,
      null,
      false,
    ]);
  });

  it.each([
    [{}, "point.required"],
    [{ latitude: -3.7 }, "point.required"],
    [{ longitude: -38.5 }, "point.required"],
    [{ latitude: null, longitude: null }, "point.required"],
    [{ latitude: "a" as unknown as number, longitude: -38.5 }, "point.invalid"],
    [{ latitude: Number.NaN, longitude: -38.5 }, "point.invalid"],
    [{ latitude: Infinity, longitude: -38.5 }, "point.invalid"],
    [{ latitude: 91, longitude: -38.5 }, "point.invalid"],
    [{ latitude: -3.7, longitude: -181 }, "point.invalid"],
  ])("refuses the point %j (point)", (point, key) => {
    expect(errorsOf(() => new Location({ name: "x", address: "y", ...point }).validate())).toEqual([
      `location.${key}`,
    ]);
  });

  it("collects the point key with the name and address keys", () => {
    expect(errorsOf(() => new Location({ name: "", address: "" }).validate())).toEqual([
      "location.name.required",
      "location.address.required",
      "location.point.required",
    ]);
  });
});

describe("normalizeLocationName", () => {
  it("drops accents, case and surrounding spaces", () => {
    expect(normalizeLocationName("  Práia do FUTURO ")).toBe("praia do futuro");
  });
});
