import { EmailRule, RequiredRule } from "@rochas-surf-school/shared";

import { getStatus, isValid } from "./field-validation";

describe("isValid", () => {
  it("accepts a value that passes every rule", () => {
    expect(
      isValid("ana@gmail.com", [new RequiredRule(), new EmailRule()]),
    ).toBe(true);
  });

  it("rejects a value that breaks a rule", () => {
    expect(isValid("ana@", [new RequiredRule(), new EmailRule()])).toBe(false);
    expect(isValid("", [new RequiredRule()])).toBe(false);
  });
});

describe("getStatus", () => {
  it.each([
    ["ana@", false, true, "error"],
    ["ana@", false, false, "neutral"],
    ["", false, true, "neutral"],
    ["ana@gmail.com", true, true, "neutral"],
  ])("for %p (valid %p, touched %p) is %s", (value, valid, touched, status) => {
    expect(getStatus(value, valid, touched)).toBe(status);
  });
});
