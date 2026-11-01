import { render, screen, userEvent } from "@testing-library/react-native";
import { openBrowserAsync } from "expo-web-browser";

import { AlertMessageProvider } from "@/providers/alert-message";

import { EmailChoiceScreen } from "./email-choice.screen";

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));

describe("EmailChoiceScreen", () => {
  it("opens the Terms of Use and the Privacy Policy", async () => {
    process.env.EXPO_PUBLIC_WEB_URL = "http://localhost:3000";
    const user = userEvent.setup();
    await render(
      <AlertMessageProvider>
        <EmailChoiceScreen />
      </AlertMessageProvider>,
    );

    await user.press(screen.getByRole("link", { name: "Terms of Use" }));
    await user.press(screen.getByRole("link", { name: "Privacy Policy" }));

    expect(openBrowserAsync).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/en/terms-of-use",
    );
    expect(openBrowserAsync).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/en/privacy-policy",
    );
  });
});
