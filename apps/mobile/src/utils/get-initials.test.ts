import { getInitials } from "./get-initials";

describe("getInitials", () => {
  it.each([
    ["Ana Souza", "AS"],
    ["ana maria de souza", "AS"],
    ["Ana", "A"],
    ["  bruno   lima  ", "BL"],
    ["", ""],
    ["   ", ""],
  ])("turns %p into %p", (name, initials) => {
    expect(getInitials(name)).toBe(initials);
  });
});
