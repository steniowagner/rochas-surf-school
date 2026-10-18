import { buildLocation } from "../classes.test-utils";

import { addLocation, removeLocation, replaceLocation } from "./locations-cache";

describe("addLocation", () => {
  it("starts a list", () => {
    const location = buildLocation({ id: "a", name: "Praia" });

    expect(addLocation(undefined, location)).toEqual({ items: [location] });
  });

  it("keeps the backend's order: name without accents or case, then id", () => {
    const out = addLocation(
      {
        items: [buildLocation({ id: "z", name: "praia" }), buildLocation({ id: "b", name: "Água" })],
      },
      buildLocation({ id: "a", name: "PRAIA" }),
    );

    expect(out.items.map((item) => item.id)).toEqual(["b", "a", "z"]);
  });
});

describe("replaceLocation", () => {
  it("puts the edited location in place of the stored one, in order", () => {
    const out = replaceLocation(
      { items: [buildLocation({ id: "a", name: "Água" }), buildLocation({ id: "b", name: "Beta" })] },
      buildLocation({ id: "a", name: "Zeta", address: "new" }),
    );

    expect(out.items.map((item) => [item.id, item.name, item.address])).toEqual([
      ["b", "Beta", "Av. Zezé Diogo, 5000"],
      ["a", "Zeta", "new"],
    ]);
  });

  it("starts a list when none was loaded", () => {
    const location = buildLocation();

    expect(replaceLocation(undefined, location)).toEqual({ items: [location] });
  });
});

describe("removeLocation", () => {
  it("drops the location and tolerates a list that was not loaded", () => {
    const out = removeLocation(
      { items: [buildLocation({ id: "a" }), buildLocation({ id: "b" })] },
      "a",
    );

    expect(out.items.map((item) => item.id)).toEqual(["b"]);
    expect(removeLocation(undefined, "a")).toEqual({ items: [] });
  });
});
