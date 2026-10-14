import { formatBrazilianPhone, toBrazilianDigits } from "./brazilian-phone";

describe("formatBrazilianPhone", () => {
  it.each([
    ["", ""],
    ["8", "(8"],
    ["85", "(85"],
    ["859", "(85) 9"],
    ["8599", "(85) 99"],
    ["85999", "(85) 999"],
    ["859999", "(85) 9999"],
    ["8533334", "(85) 3333-4"],
    ["85333344", "(85) 3333-44"],
    ["853333444", "(85) 3333-444"],
    ["8533334444", "(85) 3333-4444"],
    ["85999998888", "(85) 99999-8888"],
  ])("formats %p as %p", (digits, expected) => {
    expect(formatBrazilianPhone(digits)).toBe(expected);
  });

  it.each(["8", "85", "859999", "8599999", "85999998888"])(
    "never ends %p with a separator",
    (digits) => {
      expect(formatBrazilianPhone(digits)).toMatch(/[\d]$/);
    },
  );
});

describe("toBrazilianDigits", () => {
  it("keeps only the digits", () => {
    expect(toBrazilianDigits("(85) 99999-8888")).toBe("85999998888");
    expect(toBrazilianDigits("abc")).toBe("");
  });

  it("ignores a 12th digit", () => {
    expect(toBrazilianDigits("859999988889")).toBe("85999998888");
  });

  it("drops the leading 55 of a pasted +55 number", () => {
    expect(toBrazilianDigits("+55 85 99999-8888")).toBe("85999998888");
  });

  it("keeps 55 when it is the area code", () => {
    expect(toBrazilianDigits("55 99999-8888")).toBe("55999998888");
    expect(toBrazilianDigits("55")).toBe("55");
  });

  it("keeps the masked text as it was", () => {
    expect(toBrazilianDigits("(85) 9999")).toBe("859999");
  });
});
