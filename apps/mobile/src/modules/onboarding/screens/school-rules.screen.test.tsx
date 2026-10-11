import { render, screen } from "@testing-library/react-native";

import i18n from "@/i18n";

import { SchoolRulesScreen } from "./school-rules.screen";

describe("SchoolRulesScreen", () => {
  it.each([
    ["en-US", "School rules"],
    ["pt-BR", "Regras da escola"],
    ["es-ES", "Normas de la escuela"],
  ])("shows the title in %s", async (language, title) => {
    await i18n.changeLanguage(language);
    await render(<SchoolRulesScreen />);

    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
  });
});
