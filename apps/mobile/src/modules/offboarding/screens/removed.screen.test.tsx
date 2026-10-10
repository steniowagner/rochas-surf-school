import { render, screen } from "@testing-library/react-native";

import { RemovedScreen } from "./removed.screen";

describe("RemovedScreen", () => {
  it("shows the flow name", async () => {
    await render(<RemovedScreen />);

    expect(
      screen.getByRole("header", { name: "Access removed" }),
    ).toBeOnTheScreen();
  });
});
