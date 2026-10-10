import { render, screen } from "@testing-library/react-native";

import { AdminScreen } from "./admin.screen";

describe("AdminScreen", () => {
  it("shows the flow name", async () => {
    await render(<AdminScreen />);

    expect(screen.getByRole("header", { name: "Admin" })).toBeOnTheScreen();
  });
});
