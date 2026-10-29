import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { progressStorageKey, readProgress, removeProgress, writeProgress } from "./journey-progress-storage";

const KEY = "rochas-surf-school:user-journeys:student";
const ROW_IDS = ["ST-01", "ST-02", "ST-03"];

describe("journey progress storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses one key per flow, without the language", () => {
    expect(progressStorageKey("student")).toBe(KEY);
    expect(progressStorageKey("admin")).toBe("rochas-surf-school:user-journeys:admin");
  });

  it("saves the D-16 shape and restores it", () => {
    const progress = { name: "Ana", results: { "ST-01": "approved" as const }, notes: { "ST-02": "Slow" } };

    writeProgress("student", progress);

    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ version: 1, ...progress });
    expect(readProgress("student", ROW_IDS)).toEqual(progress);
    expect(readProgress("admin", ROW_IDS)).toBeNull();
  });

  it("returns null when nothing is saved", () => {
    expect(readProgress("student", ROW_IDS)).toBeNull();
  });

  it("ignores a value that isn't valid JSON", () => {
    localStorage.setItem(KEY, "{not json");

    expect(readProgress("student", ROW_IDS)).toBeNull();
  });

  it("ignores another version and a value that isn't an object", () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, name: "Ana", results: {}, notes: {} }));
    expect(readProgress("student", ROW_IDS)).toBeNull();

    localStorage.setItem(KEY, JSON.stringify([1, 2]));
    expect(readProgress("student", ROW_IDS)).toBeNull();

    localStorage.setItem(KEY, "null");
    expect(readProgress("student", ROW_IDS)).toBeNull();
  });

  it("drops unknown row ids and values of the wrong type", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 1,
        name: 42,
        results: { "ST-01": "denied", "ST-02": "maybe", "XX-99": "approved" },
        notes: { "ST-03": "ok", "ST-01": 7, "XX-99": "gone" },
      }),
    );

    expect(readProgress("student", ROW_IDS)).toEqual({
      name: "",
      results: { "ST-01": "denied" },
      notes: { "ST-03": "ok" },
    });
  });

  it("treats missing results and notes as empty", () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, name: "Ana", results: [], notes: "x" }));

    expect(readProgress("student", ROW_IDS)).toEqual({ name: "Ana", results: {}, notes: {} });
  });

  it("removes the flow's key only", () => {
    writeProgress("student", { name: "Ana", results: {}, notes: {} });
    writeProgress("admin", { name: "Bia", results: {}, notes: {} });

    removeProgress("student");

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(progressStorageKey("admin"))).not.toBeNull();
  });

  it("never throws when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(readProgress("student", ROW_IDS)).toBeNull();
    expect(() => writeProgress("student", { name: "Ana", results: {}, notes: {} })).not.toThrow();
    expect(() => removeProgress("student")).not.toThrow();
  });
});
