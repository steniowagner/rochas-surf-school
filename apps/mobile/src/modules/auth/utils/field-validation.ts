import { ValidationRule, Validator } from "@rochas-surf-school/shared";

import { TextInputStatus } from "@/components/ui/text-input/text-input.types";

/** Whether `value` passes every rule, using the same `Validator` the backend's entities use. */
export const isValid = (value: string, rules: ValidationRule[]) => {
  try {
    Validator.validate([{ code: "field", value, rules }]);

    return true;
  } catch {
    return false;
  }
};

/** A field shows its error only after it was left and while it isn't empty. */
export const getStatus = (
  value: string,
  isValidValue: boolean,
  isTouched: boolean,
): TextInputStatus => {
  return value !== "" && !isValidValue && isTouched ? "error" : "neutral";
};
