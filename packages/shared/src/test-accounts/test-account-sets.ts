export interface TestAccount {
  role: "admin" | "instructor" | "student";
  email: string;
  /** The account's name as the app stores it (Portuguese, never translated). */
  name: string;
}

export interface TestAccountSet {
  /** The set's number, `"01"` to `"12"`. */
  set: string;
  /** The set's admin, instructor and student, in that order. */
  accounts: readonly [TestAccount, TestAccount, TestAccount];
}

/** The number in each set's names, spelled in Portuguese: "Admin Teste Um" is set 01's admin. */
const SET_NAMES = [
  "Um",
  "Dois",
  "Três",
  "Quatro",
  "Cinco",
  "Seis",
  "Sete",
  "Oito",
  "Nove",
  "Dez",
  "Onze",
  "Doze",
] as const;

const EMAIL_DOMAIN = "rochas-surf-school.test";

/**
 * The 12 test sets of spec 076 (D-21): per set an admin, an instructor and a student review account. It holds
 * no sign-in code: the codes are never committed (D-22), the backend's `npm run test-accounts` draws them.
 */
export const testAccountSets: readonly TestAccountSet[] = SET_NAMES.map(
  (number, index) => {
    const set = String(index + 1).padStart(2, "0");
    return {
      set,
      accounts: [
        {
          role: "admin",
          email: `teste${set}.admin@${EMAIL_DOMAIN}`,
          name: `Admin Teste ${number}`,
        },
        {
          role: "instructor",
          email: `teste${set}.instrutor@${EMAIL_DOMAIN}`,
          name: `Instrutor Teste ${number}`,
        },
        {
          role: "student",
          email: `teste${set}.aluno@${EMAIL_DOMAIN}`,
          name: `Aluno Teste ${number}`,
        },
      ],
    };
  },
);
