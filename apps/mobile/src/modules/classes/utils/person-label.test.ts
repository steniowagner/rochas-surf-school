import i18n from "@/i18n";

import { personLabel } from "./person-label";

describe("personLabel", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en-US");
  });

  it("answers the name of a person who still has one, in both lists", () => {
    expect(personLabel("Ana Souza", "student", i18n.t)).toBe("Ana Souza");
    expect(personLabel("Ana Souza", "instructor", i18n.t)).toBe("Ana Souza");
  });

  it.each([
    ["pt-BR", "Ex-aluno", "Ex-instrutor"],
    ["es-ES", "Exalumno", "Exinstructor"],
    ["en-US", "Former student", "Former instructor"],
  ])("labels an erased person by the list in %s", async (locale, student, instructor) => {
    await i18n.changeLanguage(locale);

    expect(personLabel(null, "student", i18n.t)).toBe(student);
    expect(personLabel(null, "instructor", i18n.t)).toBe(instructor);
  });
});
