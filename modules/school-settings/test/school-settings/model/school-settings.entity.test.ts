import { ValidationException } from "@rochas-surf-school/shared";
import {
  SCHOOL_SETTINGS_ID,
  SchoolSettings,
  SchoolSettingsState,
} from "../../../src/school-settings/model/school-settings.entity";

function getValidationMessages(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

function validationMessagesFor(state: SchoolSettingsState): string[] {
  const settings = new SchoolSettings(state);
  return getValidationMessages(() => settings.validate());
}

describe("SchoolSettings", () => {
  describe("creation", () => {
    it("creates valid settings with a number", () => {
      const settings = new SchoolSettings({
        id: SCHOOL_SETTINGS_ID,
        whatsappNumber: "+5585999998888",
      });

      expect(settings.id).toBe(SCHOOL_SETTINGS_ID);
      expect(settings.whatsappNumber).toBe("+5585999998888");
      expect(settings.createdAt).toBeInstanceOf(Date);
      expect(settings.updatedAt.getTime()).toBe(settings.createdAt.getTime());
      expect(settings.deletedAt).toBeNull();
      expect(() => settings.validate()).not.toThrow();
    });

    it("uses a valid UUID v4 as the fixed id", () => {
      expect(
        () => new SchoolSettings({ id: SCHOOL_SETTINGS_ID }),
      ).not.toThrow();
    });

    it("leaves the number undefined when none is given", () => {
      expect(new SchoolSettings({}).whatsappNumber).toBeUndefined();
    });

    it("has the waiting list on unless it was turned off", () => {
      expect(new SchoolSettings({}).waitingListEnabled).toBe(true);
      expect(
        new SchoolSettings({ waitingListEnabled: false }).waitingListEnabled,
      ).toBe(false);
    });

    it("replaces the number through clone and keeps the id", () => {
      const settings = new SchoolSettings({
        id: SCHOOL_SETTINGS_ID,
        whatsappNumber: "+5585999998888",
      });

      const replaced = settings.clone({ whatsappNumber: "+351912345678" });

      expect(replaced.id).toBe(SCHOOL_SETTINGS_ID);
      expect(replaced.whatsappNumber).toBe("+351912345678");
      expect(settings.whatsappNumber).toBe("+5585999998888");
    });
  });

  describe("lazy validation", () => {
    it("can exist with an invalid number until validate() is called", () => {
      const settings = new SchoolSettings({ whatsappNumber: "+55123" });

      expect(settings.whatsappNumber).toBe("+55123");
      expect(() => settings.validate()).toThrow(ValidationException);
    });
  });

  describe("validate", () => {
    it.each(["+5585999998888", "+351912345678", "+14155552671"])(
      "accepts the E.164 number %s",
      (whatsappNumber) => {
        expect(validationMessagesFor({ whatsappNumber })).toEqual([]);
      },
    );

    it.each([
      ["missing", undefined],
      ["null", null],
      ["empty", ""],
      ["blank", "   "],
    ])("requires the number when it is %s", (_label, whatsappNumber) => {
      expect(
        validationMessagesFor({
          whatsappNumber: whatsappNumber as unknown as string,
        }),
      ).toEqual(["schoolSettings.whatsappNumber.required"]);
    });

    it.each([
      ["with spaces, dashes and brackets", "+55 (85) 99999-8888"],
      ["with an extension", "+5585999998888 ext. 12"],
      ["with a trailing space", "+5585999998888 "],
      ["impossible", "+55123"],
      ["without the plus sign", "5585999998888"],
      ["a number type", 5585999998888],
    ])("refuses a number %s", (_label, whatsappNumber) => {
      expect(
        validationMessagesFor({
          whatsappNumber: whatsappNumber as unknown as string,
        }),
      ).toEqual(["schoolSettings.whatsappNumber.phone"]);
    });
  });
});
