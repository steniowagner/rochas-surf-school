import { render, screen, userEvent } from "@testing-library/react-native";

import { ClassGuestRow } from "./class-guest-row.component";

describe("ClassGuestRow", () => {
  it("shows the person icon, the name and the Trial chip, and is not a button", async () => {
    await render(<ClassGuestRow name="Carolina Reis" />);

    expect(screen.getByLabelText("Trial")).toBeOnTheScreen();
    expect(screen.getByText("Carolina Reis")).toBeOnTheScreen();
    expect(screen.getByText("Trial")).toBeOnTheScreen();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the Trial chip alone without a name", async () => {
    await render(<ClassGuestRow name={null} />);

    expect(screen.getAllByText("Trial")).toHaveLength(1);
  });

  it("gives a Take out button named after the guest, or Trial without a name", async () => {
    const user = userEvent.setup();
    const onTakeOut = jest.fn();
    const view = await render(<ClassGuestRow name="Carolina Reis" onTakeOut={onTakeOut} />);

    await user.press(screen.getByRole("button", { name: "Take out Carolina Reis" }));
    expect(onTakeOut).toHaveBeenCalledTimes(1);

    await view.rerender(<ClassGuestRow name={null} onTakeOut={onTakeOut} />);

    expect(screen.getByRole("button", { name: "Take out Trial" })).toBeOnTheScreen();
  });
});
