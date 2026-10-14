import { render, screen, userEvent } from "@testing-library/react-native";

import { FilterBar } from "./filter-bar.component";

const setup = async (overrides = {}) => {
  const props = {
    role: "all" as const,
    sort: "recent" as const,
    onOpen: jest.fn(),
    onClearRole: jest.fn(),
    onClearSort: jest.fn(),
    ...overrides,
  };

  await render(<FilterBar {...props} />);

  return { props };
};

describe("FilterBar", () => {
  it("shows no chip by default, only the filter button", async () => {
    await setup();

    expect(screen.getByRole("button", { name: "Open filters" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Remove filter/ })).not.toBeOnTheScreen();
  });

  it("opens the filters", async () => {
    const user = userEvent.setup();
    const { props } = await setup();

    await user.press(screen.getByRole("button", { name: "Open filters" }));

    expect(props.onOpen).toHaveBeenCalledTimes(1);
  });

  it("shows a chip per applied filter and removes each when pressed", async () => {
    const user = userEvent.setup();
    const { props } = await setup({ role: "instructor", sort: "name" });

    expect(screen.getByText("Instructors")).toBeOnTheScreen();
    expect(screen.getByText("Name")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Remove filter Instructors" }));
    await user.press(screen.getByRole("button", { name: "Remove filter Name" }));

    expect(props.onClearRole).toHaveBeenCalledTimes(1);
    expect(props.onClearSort).toHaveBeenCalledTimes(1);
  });
});
