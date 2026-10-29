import { EmailRule, PersonNameRule, testAccountSets } from "../../src/index";

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
          email: `teste${set}.admin@rochas-surf-school.test`,
          name: `Admin Teste ${number}`,
        },
        {
          role: "instructor",
          email: `teste${set}.instrutor@rochas-surf-school.test`,
          name: `Instrutor Teste ${number}`,
        },
        {
          role: "student",
          email: `teste${set}.aluno@rochas-surf-school.test`,
          name: `Aluno Teste ${number}`,
        },
      ]);
    });
  });

  test("holds the accounts of spec 076 word for word", () => {
    expect(testAccountSets[2]).toEqual({
      set: "03",
      accounts: [
        {
          role: "admin",
          email: "teste03.admin@rochas-surf-school.test",
          name: "Admin Teste Três",
        },
        {
          role: "instructor",
          email: "teste03.instrutor@rochas-surf-school.test",
          name: "Instrutor Teste Três",
        },
        {
          role: "student",
          email: "teste03.aluno@rochas-surf-school.test",
          name: "Aluno Teste Três",
        },
      ],
    });
    expect(testAccountSets[0].accounts[0].name).toBe("Admin Teste Um");
    expect(testAccountSets[11].accounts[2]).toEqual({
      role: "student",
      email: "teste12.aluno@rochas-surf-school.test",
      name: "Aluno Teste Doze",
    });
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
