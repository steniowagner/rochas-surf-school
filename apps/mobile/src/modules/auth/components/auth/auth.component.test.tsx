import { render, screen, userEvent } from "@testing-library/react-native";

import i18n from "@/i18n";

import { AuthComponent } from "./auth.component";

jest.useFakeTimers();

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
});
