import { act, render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import i18n from "@/i18n";

import { AuthComponent } from "./auth.component";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.useFakeTimers();

describe("AuthComponent email sign-in", () => {
  it("opens Create account when Continue with email is pressed", async () => {
    const user = userEvent.setup();
    await render(<AuthComponent />);

    await user.press(screen.getByText("Continue with email"));

    expect(router.push).toHaveBeenCalledWith(routes.auth.createAccount);
  });
});

describe("AuthComponent terms and privacy links", () => {
  describe("Terms of Use", () => {
    it("is a link in the terms sentence", async () => {
      await render(<AuthComponent />);

      expect(
        screen.getByRole("link", { name: "Terms of Use" }),
      ).toBeOnTheScreen();
    });

    it("calls onTermsPress, and only that, when pressed", async () => {
      const user = userEvent.setup();
      const onTermsPress = jest.fn();
      const onPrivacyPress = jest.fn();
      await render(
        <AuthComponent
          onTermsPress={onTermsPress}
          onPrivacyPress={onPrivacyPress}
        />,
      );

      await user.press(screen.getByRole("link", { name: "Terms of Use" }));

      expect(onTermsPress).toHaveBeenCalledTimes(1);
      expect(onPrivacyPress).not.toHaveBeenCalled();
    });

    it("can be pressed when no handler is given", async () => {
      const user = userEvent.setup();
      await render(<AuthComponent />);

      await user.press(screen.getByRole("link", { name: "Terms of Use" }));

      expect(
        screen.getByRole("link", { name: "Terms of Use" }),
      ).toBeOnTheScreen();
    });
  });

  describe("Privacy Policy", () => {
    it("is a link in the terms sentence", async () => {
      await render(<AuthComponent />);

      expect(
        screen.getByRole("link", { name: "Privacy Policy" }),
      ).toBeOnTheScreen();
    });

    it("calls onPrivacyPress, and only that, when pressed", async () => {
      const user = userEvent.setup();
      const onTermsPress = jest.fn();
      const onPrivacyPress = jest.fn();
      await render(
        <AuthComponent
          onTermsPress={onTermsPress}
          onPrivacyPress={onPrivacyPress}
        />,
      );

      await user.press(screen.getByRole("link", { name: "Privacy Policy" }));

      expect(onPrivacyPress).toHaveBeenCalledTimes(1);
      expect(onTermsPress).not.toHaveBeenCalled();
    });

    it("can be pressed when no handler is given", async () => {
      const user = userEvent.setup();
      await render(<AuthComponent />);

      await user.press(screen.getByRole("link", { name: "Privacy Policy" }));

      expect(
        screen.getByRole("link", { name: "Privacy Policy" }),
      ).toBeOnTheScreen();
    });
  });

  describe.each([
    ["es-ES", "Términos de uso", "Política de privacidad"],
    ["pt-BR", "Termos de Uso", "Política de Privacidade"],
  ])("in %s", (locale, termsName, privacyName) => {
    it("shows both links in that language and still calls the right handler", async () => {
      await i18n.changeLanguage(locale);
      const user = userEvent.setup();
      const onTermsPress = jest.fn();
      const onPrivacyPress = jest.fn();
      await render(
        <AuthComponent
          onTermsPress={onTermsPress}
          onPrivacyPress={onPrivacyPress}
        />,
      );

      await user.press(screen.getByRole("link", { name: termsName }));
      await user.press(screen.getByRole("link", { name: privacyName }));

      expect(onTermsPress).toHaveBeenCalledTimes(1);
      expect(onPrivacyPress).toHaveBeenCalledTimes(1);
    });
  });

  it("updates the links when the language changes while the screen is shown", async () => {
    await render(<AuthComponent />);

    await act(async () => {
      await i18n.changeLanguage("pt-BR");
    });

    expect(
      screen.getByRole("link", { name: "Termos de Uso" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("link", { name: "Política de Privacidade" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("link", { name: "Terms of Use" })).toBeNull();
  });
});
