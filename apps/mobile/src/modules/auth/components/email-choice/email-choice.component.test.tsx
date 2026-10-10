import { render, screen, userEvent } from "@testing-library/react-native";

import i18n from "@/i18n";

import { EmailChoice } from "./email-choice.component";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

describe("EmailChoice", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en-US");
  });

  it("shows the choose content", async () => {
    await render(<EmailChoice />);

    expect(
      screen.getByRole("header", { name: "Continue with email" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Do you already have a Rocha's account, or is this your first time?",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "I have an account" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Sign in with the email you signed up with."),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "I'm new here" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Create an account with your name and email."),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("link", { name: "Terms of Use" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
  });

  it.each([
    ["pt-BR", "Continuar com e-mail", "Já tenho conta", "É minha primeira vez"],
    ["es-ES", "Continuar con email", "Ya tengo cuenta", "Es mi primera vez"],
  ])("shows the content in %s", async (locale, title, existing, fresh) => {
    await i18n.changeLanguage(locale);

    await render(<EmailChoice />);

    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: existing })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: fresh })).toBeOnTheScreen();
  });

  it("calls the handler of the pressed row", async () => {
    const user = userEvent.setup();
    const onHaveAccountPress = jest.fn();
    const onNewPress = jest.fn();
    await render(
      <EmailChoice
        onHaveAccountPress={onHaveAccountPress}
        onNewPress={onNewPress}
      />,
    );

    await user.press(screen.getByRole("button", { name: "I have an account" }));
    expect(onHaveAccountPress).toHaveBeenCalledTimes(1);
    expect(onNewPress).not.toHaveBeenCalled();

    await user.press(screen.getByRole("button", { name: "I'm new here" }));
    expect(onNewPress).toHaveBeenCalledTimes(1);
  });

  it("does nothing when a row is pressed without handlers", async () => {
    const user = userEvent.setup();
    await render(<EmailChoice />);

    await user.press(screen.getByRole("button", { name: "I have an account" }));
    await user.press(screen.getByRole("button", { name: "I'm new here" }));

    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
  });
});
