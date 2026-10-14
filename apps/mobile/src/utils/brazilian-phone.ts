const MAX_DIGITS = 11;
const COUNTRY_CODE = "55";

/** The digits of a typed or pasted Brazilian number: a leading `55` is dropped only when there are too many digits. */
export const toBrazilianDigits = (text: string) => {
  const digits = text.replace(/\D/g, "");
  const national =
    digits.length > MAX_DIGITS && digits.startsWith(COUNTRY_CODE)
      ? digits.slice(COUNTRY_CODE.length)
      : digits;

  return national.slice(0, MAX_DIGITS);
};

/** `(DD) DDDD-DDDD` for a landline and `(DD) DDDDD-DDDD` for a mobile, never ending with a separator. */
export const formatBrazilianPhone = (digits: string) => {
  if (digits.length <= 2) {
    return digits === "" ? "" : `(${digits}`;
  }

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);

  if (number.length <= 4) {
    return `(${areaCode}) ${number}`;
  }

  const dashAt = digits.length === MAX_DIGITS ? 5 : 4;

  return `(${areaCode}) ${number.slice(0, dashAt)}-${number.slice(dashAt)}`;
};
