import { render, screen } from "@testing-library/react-native";

import { InstructorScreen } from "./instructor.screen";

describe("InstructorScreen", () => {
  it("shows the flow name", async () => {
    await render(<InstructorScreen />);

    expect(
      screen.getByRole("header", { name: "Instructor" }),
    ).toBeOnTheScreen();
  });
});
