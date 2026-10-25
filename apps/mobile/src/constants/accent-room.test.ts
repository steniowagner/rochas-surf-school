import { accentRoom } from "./accent-room";

describe("accentRoom", () => {
  it("keeps a quarter of the font size above uppercase titles", () => {
    expect(accentRoom("screenTitle")).toBe(9);
    expect(accentRoom("screenTitleWithBack")).toBe(6);
    expect(accentRoom("sheetTitle")).toBe(8);
  });

  it("leaves the wordmark alone, since it sets its own leading", () => {
    expect(accentRoom("wordmark")).toBe(0);
  });

  it("keeps no room for styles that aren't uppercase or have a taller line", () => {
    expect(accentRoom("lessonTime")).toBe(0);
    expect(accentRoom("body")).toBe(0);
    expect(accentRoom("button")).toBe(0);
  });
});
