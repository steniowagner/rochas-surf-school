import { render, screen, userEvent } from "@testing-library/react-native";

import { PeopleEntryRow } from "./people-entry-row.component";

describe("PeopleEntryRow", () => {
  it("shows the label and the placeholder count", async () => {
    await render(<PeopleEntryRow onPress={jest.fn()} />);

    expect(screen.getByText("People")).toBeOnTheScreen();
    expect(screen.getByText("9 on the platform")).toBeOnTheScreen();
  });

  it("calls onPress", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<PeopleEntryRow onPress={onPress} />);

    await user.press(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
