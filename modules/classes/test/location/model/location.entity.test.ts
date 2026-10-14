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
    expect(errorsOf(() => new Location(state).validate())).toEqual(keys);
  });
});

describe("normalizeLocationName", () => {
  it("drops accents, case and surrounding spaces", () => {
    expect(normalizeLocationName("  Práia do FUTURO ")).toBe("praia do futuro");
  });
});
