import { fireEvent, render, screen } from "@testing-library/react-native";

import { StudentAvatar } from "./student-avatar.component";

describe("StudentAvatar", () => {
  it("shows the photo when there is one", async () => {
    await render(
      <StudentAvatar
        name="Marina Costa"
        photoUrl="https://img.test/m.jpg"
        size={26}
      />,
    );

    expect(screen.getByTestId("student-avatar-photo")).toBeOnTheScreen();
    expect(screen.queryByText("MC")).not.toBeOnTheScreen();
  });

  it("shows the initials on a sand circle when there is no photo", async () => {
    await render(
      <StudentAvatar name="Marina Costa" photoUrl={null} size={26} />,
    );

    expect(screen.getByText("MC")).toBeOnTheScreen();
    expect(screen.queryByTestId("student-avatar-photo")).not.toBeOnTheScreen();
    expect(screen.getByLabelText("Marina Costa").props.className).toContain(
      "bg-sand",
    );
  });

  it("falls back to the initials when the photo fails to load", async () => {
    await render(
      <StudentAvatar
        name="Marina Costa"
        photoUrl="https://img.test/x.jpg"
        size={26}
      />,
    );

    await fireEvent(screen.getByTestId("student-avatar-photo"), "error", {
      nativeEvent: { error: "404" },
    });

    expect(screen.queryByTestId("student-avatar-photo")).not.toBeOnTheScreen();
    expect(screen.getByText("MC")).toBeOnTheScreen();
  });

  it("draws the surface ring only when asked and sizes the circle", async () => {
    await render(
      <StudentAvatar name="Marina Costa" photoUrl={null} size={26} ringed />,
    );

    const circle = screen.getByLabelText("Marina Costa");
    expect(circle.props.className).toContain("border-surface");
    expect(circle.props.style).toEqual(
      expect.objectContaining({ width: 26, height: 26, borderRadius: 13 }),
    );
  });

  it("scales the initials' line height with the font so a 40pt circle doesn't clip them", async () => {
    await render(
      <StudentAvatar name="Marina Costa" photoUrl={null} size={40} />,
    );

    expect(screen.getByText("MC").props.style).toEqual(
      expect.objectContaining({ fontSize: 13, lineHeight: 17 }),
    );
  });
});
