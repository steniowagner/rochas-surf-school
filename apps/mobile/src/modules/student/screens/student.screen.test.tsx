import { render, screen } from "@testing-library/react-native";

import { StudentScreen } from "./student.screen";

describe("StudentScreen", () => {
  it("shows the flow name", async () => {
    await render(<StudentScreen />);

    expect(screen.getByRole("header", { name: "Student" })).toBeOnTheScreen();
  });
});
