import { render, screen } from "@testing-library/react-native";

import { ReactivationScreen } from "./reactivation.screen";

describe("ReactivationScreen", () => {
  it("shows the flow name", async () => {
    await render(<ReactivationScreen />);

    expect(
      screen.getByRole("header", { name: "Reactivation" }),
    ).toBeOnTheScreen();
  });
});
