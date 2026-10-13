import { PhoneNumberRule } from "@rochas-surf-school/shared";
import { parsePhoneNumber } from "libphonenumber-js";

const VARIABLE = "SCHOOL_WHATSAPP_NUMBER";

export type SchoolWhatsapp = {
  /** The number as people read it, e.g. "+55 85 99999 9999". */
  formatted: string;
  /** The `wa.me` link that opens a chat with the school. */
  href: string;
};

/**
 * The school's WhatsApp number from `SCHOOL_WHATSAPP_NUMBER` (E.164). It throws when the variable is missing or
 * invalid, so prerendering a page that shows it fails `next build`.
 */
export function getSchoolWhatsapp(): SchoolWhatsapp {
  const value = process.env[VARIABLE];

  if (!value || new PhoneNumberRule().validate(value) !== null) {
    throw new Error(
      `${VARIABLE} must be set to a valid phone number in E.164 format, like +5585999999999 (got: ${JSON.stringify(value ?? null)})`,
    );
  }

  return {
    formatted: parsePhoneNumber(value).formatInternational(),
    href: `https://wa.me/${value.slice(1)}`,
  };
}
