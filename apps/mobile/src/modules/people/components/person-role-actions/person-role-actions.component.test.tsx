import { render, screen, userEvent } from "@testing-library/react-native";

import { PersonRoleActions } from "./person-role-actions.component";

describe("PersonRoleActions", () => {
  it("lists a student's actions and tells which one was pressed", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(<PersonRoleActions role="student" onSelect={onSelect} onRemove={jest.fn()} />);

    await user.press(screen.getByRole("button", { name: "Make instructor" }));
    await user.press(screen.getByRole("button", { name: "Make admin" }));

    expect(onSelect.mock.calls).toEqual([["promoteInstructor"], ["promoteAdmin"]]);
  });

  it("lists an instructor's actions", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(<PersonRoleActions role="instructor" onSelect={onSelect} onRemove={jest.fn()} />);

    await user.press(screen.getByRole("button", { name: "Make admin" }));
    await user.press(screen.getByRole("button", { name: "Make student" }));

    expect(onSelect.mock.calls).toEqual([["promoteAdmin"], ["demoteStudent"]]);
  });

  it("lists an admin's only role action, then the remove action", async () => {
    const onSelect = jest.fn();
    const onRemove = jest.fn();
    const user = userEvent.setup();
    await render(<PersonRoleActions role="admin" onSelect={onSelect} onRemove={onRemove} />);

    expect(screen.getAllByRole("button").map((item) => item.props.accessibilityLabel)).toEqual([
      "Remove admin",
      "Remove from the platform",
    ]);
    await user.press(screen.getByRole("button", { name: "Remove from the platform" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("lists an admin's only action", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(<PersonRoleActions role="admin" onSelect={onSelect} onRemove={jest.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(2);
    await user.press(screen.getByRole("button", { name: "Remove admin" }));

    expect(onSelect).toHaveBeenCalledWith("adminToInstructor");
  });
});
