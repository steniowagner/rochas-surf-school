import { render, screen, userEvent } from "@testing-library/react-native";

import { ClassStudentRow } from "./class-student-row.component";

describe("ClassStudentRow", () => {
  it("shows the avatar, the name and a chevron, and opens on press", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<ClassStudentRow name="Ana Souza" photoUrl={null} onPress={onPress} />);

    expect(screen.getByText("AS")).toBeOnTheScreen();
    expect(screen.getByText("Ana Souza")).toBeOnTheScreen();
    expect(screen.getByTestId("class-student-row-chevron")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Ana Souza" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows Take out instead of the chevron, which takes out without opening the row", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    const onTakeOut = jest.fn();
    await render(
      <ClassStudentRow name="Ana Souza" photoUrl={null} onPress={onPress} onTakeOut={onTakeOut} />,
    );

    expect(screen.queryByTestId("class-student-row-chevron")).toBeNull();

    await user.press(screen.getByRole("button", { name: "Take out Ana Souza" }));

    expect(onTakeOut).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });
});
