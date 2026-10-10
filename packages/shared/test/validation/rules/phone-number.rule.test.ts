import { PhoneNumberRule } from "../../../src/index";

describe("PhoneNumberRule", () => {
  const rule = new PhoneNumberRule();

  test.each(["+5585999998888", "+351912345678", "+14155552671"])(
    "accepts the valid number %s",
    (number) => {
      expect(rule.validate(number)).toBeNull();
    },
  );

  test.each(["+55123", "+5500999998888", "85999998888", "+55 85 abc"])(
    "refuses the invalid number %s",
    (number) => {
      expect(rule.validate(number)).toBe("phone");
    },
  );

  test.each([
    "+55 (85) 99999-8888",
    "+5585999998888 ext. 12",
    "+55-85-99999-8888",
    "+55.85.999998888",
    "+5585999998888 ",
  ])("refuses the non-E.164 text %j", (number) => {
    expect(rule.validate(number)).toBe("phone");
  });

  test("leaves absent values to RequiredRule", () => {
    expect(rule.validate(undefined)).toBeNull();
    expect(rule.validate(null)).toBeNull();
    expect(rule.validate("")).toBeNull();
  });

  test("refuses a non-string value", () => {
    expect(rule.validate(5585999998888)).toBe("phone");
  });

  test("validates an array item by item", () => {
    expect(rule.validate(["+5585999998888", "+351912345678"])).toBeNull();
    expect(rule.validate(["+5585999998888", "+55123"])).toBe("phone");
  });
});
