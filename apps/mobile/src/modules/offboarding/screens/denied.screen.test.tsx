import { render, screen } from "@testing-library/react-native";

import { DeniedScreen } from "./denied.screen";

describe("DeniedScreen", () => {
  it("shows the flow name", async () => {
    await render(<DeniedScreen />);

    expect(
      screen.getByRole("header", { name: "Registration denied" }),
    ).toBeOnTheScreen();
  });
});
