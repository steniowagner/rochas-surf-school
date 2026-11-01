import { EmailRule, PersonNameRule, testAccountCode, testAccountSets } from "../../src/index";

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
];

const allAccounts = testAccountSets.flatMap(({ accounts }) => accounts);

describe("testAccountSets", () => {
  test("has the 12 sets from 01 to 12, in order", () => {
    expect(testAccountSets.map(({ set }) => set)).toEqual([
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ]);
  });

  test("gives each set an admin, an instructor and a student, in that order", () => {
    for (const { accounts } of testAccountSets) {
      expect(accounts.map(({ role }) => role)).toEqual([
        "admin",
        "instructor",
        "student",
      ]);
    }
  });

  test("names the accounts and their emails after the set", () => {
    testAccountSets.forEach(({ set, accounts }, index) => {
      const number = SET_NAMES[index];
      expect(accounts).toEqual([
        {
          role: "admin",
          email: `admin${set}@test.com`,
          name: `Admin User ${number}`,
        },
        {
          role: "instructor",
          email: `instructor${set}@test.com`,
          name: `Instructor User ${number}`,
        },
        {
          role: "student",
          email: `student${set}@test.com`,
          name: `Student User ${number}`,
        },
      ]);
    });
  });

  test("holds the accounts word for word", () => {
    expect(testAccountSets[2]).toEqual({
      set: "03",
      accounts: [
        {
          role: "admin",
          email: "admin03@test.com",
          name: "Admin User Three",
        },
        {
          role: "instructor",
          email: "instructor03@test.com",
          name: "Instructor User Three",
        },
        {
          role: "student",
          email: "student03@test.com",
          name: "Student User Three",
        },
      ],
    });
    expect(testAccountSets[0].accounts[0].name).toBe("Admin User One");
    expect(testAccountSets[11].accounts[2]).toEqual({
      role: "student",
      email: "student12@test.com",
      name: "Student User Twelve",
    });
  });

  test("has a 6-digit sign-in code", () => {
    expect(testAccountCode).toMatch(/^\d{6}$/);
  });

  test("has 36 distinct emails that pass EmailRule", () => {
    const emailRule = new EmailRule();

    expect(allAccounts).toHaveLength(36);
    expect(new Set(allAccounts.map(({ email }) => email)).size).toBe(36);
    for (const { email } of allAccounts) {
      expect(emailRule.validate(email)).toBeNull();
    }
  });

  test("has names that pass PersonNameRule", () => {
    const nameRule = new PersonNameRule();

    for (const { name } of allAccounts) {
      expect(nameRule.validate(name)).toBeNull();
    }
  });

  test("holds no sign-in code", () => {
    for (const account of allAccounts) {
      expect(account).not.toHaveProperty("code");
    }
  });
});
