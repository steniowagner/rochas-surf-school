import { render, screen, userEvent } from "@testing-library/react-native";

import { FilterSheet } from "./filter-sheet.component";

const setup = async (overrides = {}) => {
  const props = {
    visible: true,
    onClose: jest.fn(),
    role: "all" as const,
    sort: "recent" as const,
    onRoleChange: jest.fn(),
    onSortChange: jest.fn(),
    ...overrides,
  };

  await render(<FilterSheet {...props} />);

  return { props };
};

describe("FilterSheet", () => {
  it("shows the role and sort options with the current ones selected", async () => {
    await setup({ role: "instructor", sort: "name" });

    expect(screen.getByText("Filters")).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Instructors", selected: true })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "All", selected: false })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Name", selected: true })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Ingress date", selected: false })).toBeOnTheScreen();
  });

  it("selects All and Ingress date by default", async () => {
    await setup();

    expect(screen.getByRole("tab", { name: "All", selected: true })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Ingress date", selected: true })).toBeOnTheScreen();
  });

  it("reports the chosen role and sort", async () => {
    const user = userEvent.setup();
    const { props } = await setup();

    await user.press(screen.getByRole("tab", { name: "Admins" }));
    await user.press(screen.getByRole("tab", { name: "Name" }));

    expect(props.onRoleChange).toHaveBeenCalledWith("admin");
    expect(props.onSortChange).toHaveBeenCalledWith("name");
  });

  it("closes with the Close button", async () => {
    const user = userEvent.setup();
    const { props } = await setup();

    await user.press(screen.getByRole("button", { name: "Close" }));

    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
