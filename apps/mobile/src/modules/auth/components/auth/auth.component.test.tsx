import { act, render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import { Platform } from "react-native";

import { routes } from "@/constants/routes";
import i18n from "@/i18n";

import { AuthComponent } from "./auth.component";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.useFakeTimers();

describe("AuthComponent email sign-in", () => {
  it("opens Choose when Continue with email is pressed", async () => {
    const user = userEvent.setup();
    await render(<AuthComponent />);

    await user.press(screen.getByText("Continue with email"));

    expect(router.push).toHaveBeenCalledWith(routes.auth.emailChoice, {
      dangerouslySingular: true,
    });
  });
});

describe("AuthComponent providers", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it("shows Apple on iOS, above Google, above email", async () => {
    Platform.OS = "ios";
    await render(<AuthComponent />);

    const labels = screen
      .getAllByRole("button", { name: /^Continue with / })
      .map((button) => button.props.accessibilityLabel);

    expect(labels).toEqual([
      "Continue with Apple",
      "Continue with Google",
      "Continue with email",
    ]);
  });

  it("hides Apple on Android and shows Google and email", async () => {
    Platform.OS = "android";
    await render(<AuthComponent />);

    expect(screen.queryByText("Continue with Apple")).toBeNull();
    expect(screen.getByText("Continue with Google")).toBeOnTheScreen();
    expect(screen.getByText("Continue with email")).toBeOnTheScreen();
  });

  it.each([
    ["es-ES", "Continuar con Apple"],
    ["pt-BR", "Continuar com a Apple"],
  ])("labels the Apple button in %s", async (locale, label) => {
    Platform.OS = "ios";
    await i18n.changeLanguage(locale);

    await render(<AuthComponent />);

    expect(screen.getByText(label)).toBeOnTheScreen();
    await act(async () => {
      await i18n.changeLanguage("en-US");
    });
  });
});

describe("AuthComponent Apple sign-in", () => {
  it("calls onApplePress when Continue with Apple is pressed", async () => {
    const user = userEvent.setup();
    const onApplePress = jest.fn();
    await render(<AuthComponent onApplePress={onApplePress} />);

    await user.press(screen.getByText("Continue with Apple"));

    expect(onApplePress).toHaveBeenCalledTimes(1);
  });

  it("loading: shows a spinner on the Apple button and ignores presses", async () => {
    const user = userEvent.setup();
    const onApplePress = jest.fn();
    await render(<AuthComponent isAppleLoading onApplePress={onApplePress} />);

    expect(screen.queryByText("Continue with Apple")).toBeNull();
    await user.press(
      screen.getByRole("button", { name: "Continue with Apple" }),
    );

    expect(onApplePress).not.toHaveBeenCalled();
  });
});

describe("AuthComponent Google sign-in", () => {
  const getSpinners = () =>
    screen.root?.queryAll((node) => node.type === "ActivityIndicator") ?? [];

  it("calls onGooglePress when Continue with Google is pressed", async () => {
    const user = userEvent.setup();
    const onGooglePress = jest.fn();
    await render(<AuthComponent onGooglePress={onGooglePress} />);

    await user.press(screen.getByText("Continue with Google"));

    expect(onGooglePress).toHaveBeenCalledTimes(1);
  });

  it("can be pressed when no handler is given", async () => {
    const user = userEvent.setup();
    await render(<AuthComponent />);

    await user.press(screen.getByText("Continue with Google"));

    expect(screen.getByText("Continue with Google")).toBeOnTheScreen();
  });

  it("loading: shows a spinner on the Google button and ignores presses", async () => {
    const user = userEvent.setup();
    const onGooglePress = jest.fn();
    await render(
      <AuthComponent isGoogleLoading onGooglePress={onGooglePress} />,
    );

    expect(getSpinners()).toHaveLength(1);
    expect(screen.queryByText("Continue with Google")).toBeNull();

    await user.press(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    expect(onGooglePress).not.toHaveBeenCalled();
    expect(screen.getByText("Continue with email")).toBeOnTheScreen();
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
