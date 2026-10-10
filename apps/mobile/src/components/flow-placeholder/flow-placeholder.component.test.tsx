import { render, screen } from "@testing-library/react-native";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";

import { FlowPlaceholder } from "./flow-placeholder.component";

const FLOW_KEYS = [
  "flows.onboarding",
  "flows.reactivation",
  "flows.offboardingDenied",
  "flows.offboardingRemoved",
  "flows.student",
  "flows.instructor",
  "flows.admin",
] as const;

function TranslatedPlaceholders() {
  const { t } = useTranslation();

  return (
    <>
      {FLOW_KEYS.map((key) => (
        <FlowPlaceholder key={key} title={t(key)} />
      ))}
    </>
  );
}

const namesOnScreen = () =>
  screen.getAllByRole("header").map((header) => header.props.children);

describe("FlowPlaceholder", () => {
  it("shows the title as a header", async () => {
    await render(<FlowPlaceholder title="Student" />);

    expect(screen.getByRole("header", { name: "Student" })).toBeOnTheScreen();
  });

  it("shows the names in en-US", async () => {
    await render(<TranslatedPlaceholders />);

    expect(namesOnScreen()).toEqual([
      "Onboarding",
      "Reactivation",
      "Registration denied",
      "Access removed",
      "Student",
      "Instructor",
      "Admin",
    ]);
  });

  it("shows the name in pt-BR and es-ES", async () => {
    await i18n.changeLanguage("pt-BR");
    await render(<TranslatedPlaceholders />);

    expect(namesOnScreen()).toEqual([
      "Primeiros passos",
      "Reativação",
      "Cadastro recusado",
      "Acesso removido",
      "Aluno",
      "Instrutor",
      "Administrador",
    ]);

    await i18n.changeLanguage("es-ES");
    await render(<TranslatedPlaceholders />);

    expect(namesOnScreen()).toEqual([
      "Primeros pasos",
      "Reactivación",
      "Registro rechazado",
      "Acceso eliminado",
      "Alumno",
      "Instructor",
      "Administrador",
    ]);
  });
});
