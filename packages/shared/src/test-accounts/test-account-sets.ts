export interface TestAccount {
  /** The account's part in the set. Only the admin starts with this role: the others start as pending students. */
  role: "admin" | "instructor" | "student";
  email: string;
  /** The account's name as the app stores it (never translated). */
  name: string;
}

export interface TestAccountSet {
  /** The set's number, `"01"` to `"12"`. */
  set: string;
  /** The set's admin, instructor and student, in that order. */
  accounts: readonly [TestAccount, TestAccount, TestAccount];
}

/** The number in each set's names, spelled because `PersonNameRule` allows letters only: "Admin User One" is set 01's admin. */
const SET_NAMES = [
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
] as const;

const EMAIL_DOMAIN = "test.com";

/**
 * The sign-in code of every test account. It's public on purpose: the web's test accounts page shows it, and it only
 * works where `REVIEW_ACCOUNTS` lists these accounts, so never on a production server.
 */
export const testAccountCode = "123456";

/**
 * The 12 test sets of spec 076 (D-21): per set an admin, an instructor and a student review account. They
 * all sign in with `testAccountCode`.
 */
export const testAccountSets: readonly TestAccountSet[] = SET_NAMES.map(
  (number, index) => {
    const set = String(index + 1).padStart(2, "0");
    return {
      set,
      accounts: [
        {
          role: "admin",
          email: `admin${set}@${EMAIL_DOMAIN}`,
          name: `Admin User ${number}`,
        },
        {
          role: "instructor",
          email: `instructor${set}@${EMAIL_DOMAIN}`,
          name: `Instructor User ${number}`,
        },
        {
          role: "student",
          email: `student${set}@${EMAIL_DOMAIN}`,
          name: `Student User ${number}`,
        },
      ],
    };
  },
);
