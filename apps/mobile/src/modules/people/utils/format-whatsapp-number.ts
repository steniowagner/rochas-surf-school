import { parsePhoneNumberFromString } from "libphonenumber-js";

/** The number in the international format ("+55 85 99999-8888"); the number as sent when it can't be parsed. */
export const formatWhatsappNumber = (number: string): string =>
  parsePhoneNumberFromString(number)?.formatInternational() ?? number;
