import { render, screen, userEvent } from "@testing-library/react-native";

import { AdminToolRow } from "./admin-tool-row.component";

const renderRow = (props: Partial<Parameters<typeof AdminToolRow>[0]> = {}) =>
  render(
    <AdminToolRow
      icon="account-plus-outline"
      title="Join the school"
      onPress={jest.fn()}
      {...props}
    />,
  );

describe("AdminToolRow", () => {
  it("shows the title, the subtitle and the count that waits", async () => {
    await renderRow({ subtitle: "3 waiting", badge: 3 });

    expect(screen.getByText("Join the school")).toBeOnTheScreen();
    expect(screen.getByText("3 waiting")).toBeOnTheScreen();
    expect(screen.getAllByText("3")).toHaveLength(1);
  });

  it("shows no count when nothing waits", async () => {
    await renderRow({ badge: 0 });

    expect(screen.queryByText("0")).not.toBeOnTheScreen();
  });

  it("calls onPress", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await renderRow({ onPress });

    await user.press(screen.getByRole("button", { name: "Join the school" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
