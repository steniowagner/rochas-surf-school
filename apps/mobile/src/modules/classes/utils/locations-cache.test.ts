import { addLocation } from "./locations-cache";

describe("addLocation", () => {
  it("starts a list", () => {
    expect(addLocation(undefined, { id: "a", name: "Praia", address: "x" })).toEqual({
      items: [{ id: "a", name: "Praia", address: "x" }],
    });
  });

  it("keeps the backend's order: name without accents or case, then id", () => {
    const out = addLocation(
      {
        items: [
          { id: "z", name: "praia", address: "1" },
          { id: "b", name: "Água", address: "2" },
        ],
      },
      { id: "a", name: "PRAIA", address: "3" },
    );

    expect(out.items.map((item) => item.id)).toEqual(["b", "a", "z"]);
  });
});
