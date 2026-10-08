import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import i18n from "@/i18n";

import { BackButton } from "./back-button.component";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));
jest.useFakeTimers();

describe("BackButton", () => {
  beforeEach(() => {
    jest.mocked(router.back).mockClear();
  });

  it("renders a button labelled Back", async () => {
    await render(<BackButton />);

    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
  });

  it("calls router.back when pressed without onPress", async () => {
    const user = userEvent.setup();
    await render(<BackButton />);

    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("calls the given onPress instead of router.back", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<BackButton onPress={onPress} />);

    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  it.each([
    ["pt-BR", "Voltar"],
    ["es-ES", "Volver"],
  ])("is labelled in %s", async (locale, label) => {
    await i18n.changeLanguage(locale);
    await render(<BackButton />);

    expect(screen.getByRole("button", { name: label })).toBeOnTheScreen();
  });
});
