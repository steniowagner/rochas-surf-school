import { render, screen, userEvent } from "@testing-library/react-native";

import { PersonRoleActions } from "./person-role-actions.component";

describe("PersonRoleActions", () => {
  it("lists a student's actions and tells which one was pressed", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(<PersonRoleActions role="student" onSelect={onSelect} />);

    await user.press(screen.getByRole("button", { name: "Make instructor" }));
    await user.press(screen.getByRole("button", { name: "Make admin" }));

    expect(onSelect.mock.calls).toEqual([
      ["promoteInstructor"],
      ["promoteAdmin"],
    ]);
  });

  it("lists an instructor's actions", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(<PersonRoleActions role="instructor" onSelect={onSelect} />);

    await user.press(screen.getByRole("button", { name: "Make admin" }));
    await user.press(screen.getByRole("button", { name: "Make student" }));

    expect(onSelect.mock.calls).toEqual([["promoteAdmin"], ["demoteStudent"]]);
  });

  it("lists an admin's only action", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(<PersonRoleActions role="admin" onSelect={onSelect} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    await user.press(screen.getByRole("button", { name: "Remove admin" }));

    expect(onSelect).toHaveBeenCalledWith("adminToInstructor");
  });
});
