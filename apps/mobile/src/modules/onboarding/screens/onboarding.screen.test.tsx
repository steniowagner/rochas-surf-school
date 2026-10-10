import { render, screen } from "@testing-library/react-native";

import { OnboardingScreen } from "./onboarding.screen";

describe("OnboardingScreen", () => {
  it("shows the flow name", async () => {
    await render(<OnboardingScreen />);

    expect(
      screen.getByRole("header", { name: "Onboarding" }),
    ).toBeOnTheScreen();
  });
});
