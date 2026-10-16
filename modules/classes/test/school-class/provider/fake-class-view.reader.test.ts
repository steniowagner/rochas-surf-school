import { buildClassView, FakeClassViewReader } from "../../mock";

describe("FakeClassViewReader", () => {
  const inside = buildClassView({ id: "a", startsAt: new Date("2026-10-12T03:00:00.000Z") });
  const outside = buildClassView({ id: "b", startsAt: new Date("2026-10-19T03:00:00.000Z") });
  const reader = new FakeClassViewReader([inside, outside]);

  it("lists the classes starting at or after from and before to", async () => {
    const items = await reader.findStartingBetween(
      new Date("2026-10-12T03:00:00.000Z"),
      new Date("2026-10-19T03:00:00.000Z"),
    );

    expect(items).toEqual([inside]);
  });

  it("finds a class by id, or null, and records the lookups", async () => {
    expect(await reader.findById("b")).toBe(outside);
    expect(await reader.findById("zzz")).toBeNull();
    expect(reader.findByIdCalls).toEqual(["b", "zzz"]);
  });

  it("starts empty by default", async () => {
    expect(await new FakeClassViewReader().findById("a")).toBeNull();
  });
});
