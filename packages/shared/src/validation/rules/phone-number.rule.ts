import { isValidPhoneNumber } from "libphonenumber-js";
import { validateStringValues } from "../rule.utils";
import { ValidationRule } from "../validation-rule.interface";

const E164_SHAPE = /^\+[1-9]\d{1,14}$/;

export class PhoneNumberRule implements ValidationRule {
  validate(value: unknown): string | null {
    return validateStringValues(
      value,
      "phone",
      (item) => E164_SHAPE.test(item) && isValidPhoneNumber(item),
    );
  }
}
