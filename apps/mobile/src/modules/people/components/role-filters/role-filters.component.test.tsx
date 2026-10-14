import { render, screen, userEvent } from "@testing-library/react-native";

import { RoleFilters } from "./role-filters.component";

describe("RoleFilters", () => {
  it("shows one unselected button per role when none is selected", async () => {
    await render(<RoleFilters roles={[]} onToggle={jest.fn()} />);

    for (const name of ["Students", "Instructors", "Admins"]) {
      expect(screen.getByRole("button", { name, selected: false })).toBeOnTheScreen();
    }
  });

  it("marks every selected role", async () => {
    await render(<RoleFilters roles={["student", "admin"]} onToggle={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Students", selected: true })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Instructors", selected: false })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Admins", selected: true })).toBeOnTheScreen();
  });

  it("reports the pressed role, selected or not", async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    await render(<RoleFilters roles={["instructor"]} onToggle={onToggle} />);

    await user.press(screen.getByRole("button", { name: "Students" }));
    await user.press(screen.getByRole("button", { name: "Instructors" }));

    expect(onToggle).toHaveBeenNthCalledWith(1, "student");
    expect(onToggle).toHaveBeenNthCalledWith(2, "instructor");
  });
});
