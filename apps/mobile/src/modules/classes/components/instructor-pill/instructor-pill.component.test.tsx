import { render, screen, userEvent } from "@testing-library/react-native";

import { InstructorPill } from "./instructor-pill.component";

describe("InstructorPill", () => {
  it("shows the avatar and the name, and is a button named after the instructor", async () => {
    await render(
      <InstructorPill name="Iara Lima" photoUrl={null} isViewer={false} onPress={jest.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Iara Lima" })).toBeOnTheScreen();
    expect(screen.getByText("Iara Lima")).toBeOnTheScreen();
    expect(screen.getByText("IL")).toBeOnTheScreen();
  });

  it("shows the instructor's photo in place of the initials", async () => {
    await render(
      <InstructorPill
        name="Iara Lima"
        photoUrl="https://img.test/iara.jpg"
        isViewer={false}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByTestId("student-avatar-photo")).toBeOnTheScreen();
    expect(screen.queryByText("IL")).toBeNull();
  });

  it("reads You for the viewer, keeping the instructor's name for accessibility", async () => {
    await render(
      <InstructorPill name="Iara Lima" photoUrl={null} isViewer onPress={jest.fn()} />,
    );

    expect(screen.getByText("You")).toBeOnTheScreen();
    expect(screen.queryByText("Iara Lima")).toBeNull();
    expect(screen.getByRole("button", { name: "Iara Lima" })).toBeOnTheScreen();
  });

  it("calls onPress when pressed", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <InstructorPill name="Iara Lima" photoUrl={null} isViewer={false} onPress={onPress} />,
    );

    await user.press(screen.getByRole("button", { name: "Iara Lima" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows an erased instructor with the generic avatar, and is no button", async () => {
    await render(
      <InstructorPill name="Former instructor" photoUrl={null} isViewer={false} erased />,
    );

    expect(screen.getByText("Former instructor")).toBeOnTheScreen();
    expect(screen.getByTestId("student-avatar-erased")).toBeOnTheScreen();
    expect(screen.queryByText("FI")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
