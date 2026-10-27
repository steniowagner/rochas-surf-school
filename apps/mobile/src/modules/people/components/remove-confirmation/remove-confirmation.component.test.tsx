import { render, screen, userEvent } from "@testing-library/react-native";

import { RemoveConfirmation } from "./remove-confirmation.component";

describe("RemoveConfirmation", () => {
  it("shows the title with the name, the student text, and calls back on confirm and back", async () => {
    const onConfirm = jest.fn();
    const onBack = jest.fn();
    const user = userEvent.setup();
    await render(
      <RemoveConfirmation role="student" name="Bia" loading={false} onConfirm={onConfirm} onBack={onBack} />,
    );

    expect(screen.getByText("Remove Bia?")).toBeOnTheScreen();
    expect(screen.getByText(/Their seats become free/)).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Remove from the platform" }));
    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it.each(["instructor", "admin"] as const)("shows the classes text for an %s", async (role) => {
    await render(
      <RemoveConfirmation role={role} name="Bia" loading={false} onConfirm={jest.fn()} onBack={jest.fn()} />,
    );

    expect(screen.getByText(/Leaves the upcoming classes they're assigned to/)).toBeOnTheScreen();
    expect(screen.queryByText(/Their seats become free/)).not.toBeOnTheScreen();
  });

  it("ignores presses while loading", async () => {
    const onConfirm = jest.fn();
    const onBack = jest.fn();
    const user = userEvent.setup();
    await render(
      <RemoveConfirmation role="student" name="Bia" loading onConfirm={onConfirm} onBack={onBack} />,
    );

    await user.press(screen.getByRole("button", { name: "Back" }));
    await user.press(screen.getByRole("button", { name: "Remove from the platform" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();
  });
});
