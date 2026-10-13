import { EmailRule } from "@rochas-surf-school/shared";

export type SchoolLegal = {
  legalName: string;
  /** The CNPJ as `00.000.000/0000-00`, or `null` when `SCHOOL_CNPJ` is not set. */
  cnpj: string | null;
  dpoName: string;
  dpoEmail: string;
};

const CNPJ_LENGTH = 14;
const FIRST_WEIGHTS = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const SECOND_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function requiredText(variable: string): string {
  const value = process.env[variable]?.trim();

  if (!value) {
    throw new Error(`${variable} must be set to a non-blank text (got: ${JSON.stringify(process.env[variable] ?? null)})`);
  }

  return value;
}

function checkDigit(digits: number[], weights: number[]): number {
  const sum = weights.reduce((total, weight, index) => total + weight * digits[index], 0);
  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}

function isValidCnpj(digits: string): boolean {
  if (digits.length !== CNPJ_LENGTH || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const numbers = digits.split("").map(Number);

  return checkDigit(numbers, FIRST_WEIGHTS) === numbers[12] && checkDigit(numbers, SECOND_WEIGHTS) === numbers[13];
}

function formatCnpj(digits: string): string {
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function optionalCnpj(): string | null {
  const value = process.env.SCHOOL_CNPJ?.trim();

  if (!value) {
    return null;
  }

  const digits = value.replace(/[.\/-]/g, "");

  if (!isValidCnpj(digits)) {
    throw new Error(`SCHOOL_CNPJ must be a valid CNPJ, with 14 digits and correct check digits (got: ${JSON.stringify(value)})`);
  }

  return formatCnpj(digits);
}

function requiredEmail(variable: string): string {
  const value = requiredText(variable);

  if (new EmailRule().validate(value) !== null) {
    throw new Error(`${variable} must be set to a valid email address (got: ${JSON.stringify(value)})`);
  }

  return value;
}

/**
 * The school's legal identity and its data protection contact (encarregado) from `SCHOOL_LEGAL_NAME`,
 * `SCHOOL_CNPJ` (optional), `DPO_NAME` and `DPO_EMAIL`. It throws naming the variable when one is missing or
 * invalid, so prerendering a page that shows them fails `next build`.
 */
export function getSchoolLegal(): SchoolLegal {
  return {
    legalName: requiredText("SCHOOL_LEGAL_NAME"),
    cnpj: optionalCnpj(),
    dpoName: requiredText("DPO_NAME"),
    dpoEmail: requiredEmail("DPO_EMAIL"),
  };
}
