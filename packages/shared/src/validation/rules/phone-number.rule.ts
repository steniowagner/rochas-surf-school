import { isValidPhoneNumber } from "libphonenumber-js";
import { validateStringValues } from "../rule.utils";
import { ValidationRule } from "../validation-rule.interface";

export class PhoneNumberRule implements ValidationRule {
  validate(value: unknown): string | null {
    return validateStringValues(
      value,
      "phone",
      (item) => item.startsWith("+") && isValidPhoneNumber(item),
    );
  }
}
