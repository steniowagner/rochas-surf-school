import { ValidationException } from "@rochas-surf-school/shared";
import { ClassMessage, ClassMessageState } from "../../../src";

const CLASS_ID = "3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a";
const SENDER_ID = "0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34";

function build(overrides: Partial<ClassMessageState> = {}): ClassMessage {
  return new ClassMessage({
    classId: CLASS_ID,
    senderId: SENDER_ID,
    title: "Aviso",
    message: "Tragam protetor.",
    ...overrides,
  });
}

function messagesOf(run: () => void): string[] {
  try {
    run();
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }

  return [];
}

describe("ClassMessage", () => {
  it("reads its fields", () => {
    const createdAt = new Date("2026-10-14T13:00:00.000Z");
    const message = build({ createdAt });

    expect(message).toMatchObject({
      classId: CLASS_ID,
      senderId: SENDER_ID,
      title: "Aviso",
      message: "Tragam protetor.",
      createdAt,
    });
    expect(message.id).toEqual(expect.any(String));
  });

  it("can exist invalid until it is validated", () => {
    const message = build({ title: "" });

    expect(() => message.validate()).toThrow(ValidationException);
  });

  it("accepts a valid message at its limits", () => {
    expect(() => build({ title: "t".repeat(60), message: "m".repeat(500) }).validate()).not.toThrow();
    expect(() => build({ title: "t", message: "m" }).validate()).not.toThrow();
  });

  it.each([
    [{ classId: "" }, "class.message.classId.required"],
    [{ classId: "not-a-uuid" }, "class.message.classId.uuid"],
    [{ senderId: "" }, "class.message.senderId.required"],
    [{ senderId: "not-a-uuid" }, "class.message.senderId.uuid"],
    [{ title: "" }, "class.message.title.required"],
    [{ title: "t".repeat(61) }, "class.message.title.range.length"],
    [{ message: "" }, "class.message.text.required"],
    [{ message: "m".repeat(501) }, "class.message.text.range.length"],
  ])("refuses %j", (overrides, key) => {
    expect(messagesOf(() => build(overrides).validate())).toEqual([key]);
  });

  it("reports every invalid field together", () => {
    expect(messagesOf(() => build({ title: "", message: "m".repeat(501) }).validate())).toEqual([
      "class.message.title.required",
      "class.message.text.range.length",
    ]);
  });
});
