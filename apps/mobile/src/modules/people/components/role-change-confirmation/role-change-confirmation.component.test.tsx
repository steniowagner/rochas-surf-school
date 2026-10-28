import { render, screen, userEvent } from "@testing-library/react-native";

import { RoleChangeConfirmation } from "./role-change-confirmation.component";

const SEATS_NOTE = "The seats and requests they had in upcoming classes, as a student, are cancelled.";

describe("RoleChangeConfirmation", () => {
  it("shows the title with the name, the description, and calls back on confirm and back", async () => {
    const onConfirm = jest.fn();
    const onBack = jest.fn();
    const user = userEvent.setup();
    await render(
      <RoleChangeConfirmation
        action="adminToInstructor"
        name="Bia"
        showSeatsNote={false}
        loading={false}
        onConfirm={onConfirm}
        onBack={onBack}
      />,
    );

    expect(screen.getByText("Remove Bia as admin?")).toBeOnTheScreen();
    expect(
      screen.getByText("They stop running the school and become an instructor. They stay on the classes they teach."),
    ).toBeOnTheScreen();
    expect(screen.queryByText(SEATS_NOTE)).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Remove admin" }));
    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows the unchecked instructor checkbox for a promotion to admin and sends its value", async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    await render(
      <RoleChangeConfirmation
        action="promoteAdmin"
        name="Ana"
        showSeatsNote={false}
        loading={false}
        onConfirm={onConfirm}
        onBack={jest.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Also an instructor" })).not.toBeChecked();
    expect(
      screen.getByText("Besides being an admin, teaches at the school."),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("They become an admin: they run the school's classes, people, rules and requests."),
    ).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Make admin" }));
    await user.press(screen.getByRole("checkbox", { name: "Also an instructor" }));
    await user.press(screen.getByRole("button", { name: "Make admin" }));

    expect(onConfirm).toHaveBeenNthCalledWith(1, false);
    expect(onConfirm).toHaveBeenNthCalledWith(2, true);
  });

  it("disables the checkbox while saving", async () => {
    await render(
      <RoleChangeConfirmation
        action="promoteAdmin"
        name="Ana"
        showSeatsNote={false}
        loading
        onConfirm={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Also an instructor" })).toBeDisabled();
  });

  it.each(["promoteInstructor", "demoteStudent", "adminToInstructor"] as const)(
    "shows no checkbox for %s",
    async (action) => {
      await render(
        <RoleChangeConfirmation
          action={action}
          name="Ana"
          showSeatsNote={false}
          loading={false}
          onConfirm={jest.fn()}
          onBack={jest.fn()}
        />,
      );

      expect(screen.queryByRole("checkbox")).not.toBeOnTheScreen();
    },
  );

  it("adds the seats note when asked, and ignores presses while loading", async () => {
    const onConfirm = jest.fn();
    const onBack = jest.fn();
    const user = userEvent.setup();
    await render(
      <RoleChangeConfirmation
        action="promoteAdmin"
        name="Ana"
        showSeatsNote
        loading
        onConfirm={onConfirm}
        onBack={onBack}
      />,
    );

    expect(screen.getByText("Make Ana an admin?")).toBeOnTheScreen();
    expect(screen.getByText(SEATS_NOTE)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(onBack).not.toHaveBeenCalled();
  });
});
