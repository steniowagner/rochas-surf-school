import { ValidationException } from "@rochas-surf-school/shared";
import { GUEST_NAME_MAX, Guest, GuestState } from "../../../src";

const CLASS_ID = "3b5c7d9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f";
const ADMIN_ID = "0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34";
const NOW = new Date("2026-10-19T09:00:00.000Z");

function build(overrides: Partial<GuestState> = {}): Guest {
  return new Guest({
    classId: CLASS_ID,
    name: "Carolina Reis",
    whatsappNumber: "+5585999990000",
    createdBy: ADMIN_ID,
    ...overrides,
  });
}

function errorsOf(guest: Guest): string[] {
  try {
    guest.validate();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationException);
    return (error as ValidationException).errors.map((item) => item.message);
  }
  throw new Error("expected a ValidationException");
}

describe("Guest", () => {
  it("keeps its state and defaults the optional fields to null", () => {
    const guest = build({ createdBy: undefined });

    expect(guest.classId).toBe(CLASS_ID);
    expect(guest.name).toBe("Carolina Reis");
    expect(guest.whatsappNumber).toBe("+5585999990000");
    expect(guest.createdBy).toBeNull();
    expect(guest.erasedAt).toBeNull();
    expect(guest.isErased).toBe(false);
    expect(() => guest.validate()).not.toThrow();
  });

  it("copies the erasure date", () => {
    const guest = build({ erasedAt: NOW, name: null, whatsappNumber: null });

    expect(guest.erasedAt).toEqual(NOW);
    expect(guest.erasedAt).not.toBe(NOW);
  });

  it("erases the name and the number", () => {
    const erased = build().erase(NOW);

    expect(erased.name).toBeNull();
    expect(erased.whatsappNumber).toBeNull();
    expect(erased.erasedAt).toEqual(NOW);
    expect(erased.updatedAt).toEqual(NOW);
    expect(erased.isErased).toBe(true);
    expect(() => erased.validate()).not.toThrow();
  });

  it.each([
    ["", ["guest.name.required"]],
    ["Ca", ["guest.name.min.length", "guest.name.person.name"]],
    ["Carolina", ["guest.name.person.name"]],
    ["Carolina 3", ["guest.name.person.name"]],
    ["a b".repeat(GUEST_NAME_MAX), ["guest.name.max.length"]],
  ])("rejects the name %j", (name, expected) => {
    expect(errorsOf(build({ name }))).toEqual(expect.arrayContaining(expected));
  });

  it.each([[""], ["85999990000"], ["+55"], ["not a number"], [null]])(
    "rejects the number %j",
    (whatsappNumber) => {
      expect(errorsOf(build({ whatsappNumber }))).toEqual(["guest.whatsappNumber.invalid"]);
    },
  );

  it("reports the name and the number problems together", () => {
    expect(errorsOf(build({ name: null, whatsappNumber: "x" }))).toEqual(
      expect.arrayContaining(["guest.name.required", "guest.whatsappNumber.invalid"]),
    );
  });

  it("rejects ids that aren't uuids", () => {
    expect(errorsOf(build({ classId: "x", createdBy: "y" }))).toEqual(
      expect.arrayContaining(["guest.classId.uuid", "guest.createdBy.uuid"]),
    );
  });

  it("rethrows what isn't a validation problem", () => {
    const guest = build();
    jest.spyOn(guest, "erasedAt", "get").mockImplementation(() => {
      throw new TypeError("boom");
    });

    expect(() => guest.validate()).toThrow(TypeError);
  });
});
