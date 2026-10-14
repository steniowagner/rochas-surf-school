import { formatWhatsappNumber } from "./format-whatsapp-number";

describe("formatWhatsappNumber", () => {
  it("formats an E.164 number internationally", () => {
    expect(formatWhatsappNumber("+5585999998888")).toBe("+55 85 99999 8888");
  });

  it("answers the number as sent when it can't be parsed", () => {
    expect(formatWhatsappNumber("abc")).toBe("abc");
  });
});
