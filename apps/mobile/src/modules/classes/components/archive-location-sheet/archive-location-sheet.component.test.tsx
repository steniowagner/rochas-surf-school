import {
  render,
  screen,
  userEvent,
  within,
} from "@testing-library/react-native";

import { ArchiveLocationSheet } from "./archive-location-sheet.component";

async function open(
  overrides: Partial<React.ComponentProps<typeof ArchiveLocationSheet>> = {},
) {
  const props = {
    visible: true,
    name: "Praia do Futuro",
    address: "Av. Zezé Diogo, 5000",
    upcomingClasses: 0,
    loading: false,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  await render(<ArchiveLocationSheet {...props} />);

  return props;
}

describe("ArchiveLocationSheet", () => {
  it("asks to remove the location, naming it, without the classes line when none is upcoming", async () => {
    await open();

    expect(screen.getByText("Remove location?")).toBeTruthy();
    const card = within(screen.getByTestId("location-summary-card"));
    expect(card.getByText("Praia do Futuro")).toBeTruthy();
    expect(card.getByText("Av. Zezé Diogo, 5000")).toBeTruthy();
    expect(
      screen.getByText("It no longer shows up for new classes."),
    ).toBeTruthy();
    expect(screen.queryByText(/stays? as (it|they) (is|are)/)).toBeNull();
  });

  it.each([
    [1, "The class that already uses this location stays as it is."],
    [3, "The 3 classes that already use this location stay as they are."],
  ])("says the %s upcoming classes stay as they are", async (count, line) => {
    await open({ upcomingClasses: count });

    expect(screen.getByText(line)).toBeTruthy();
  });

  it("confirms with 'Remove location' and keeps with 'Keep'", async () => {
    const props = await open();
    const user = userEvent.setup();

    await user.press(screen.getByRole("button", { name: "Remove location" }));
    await user.press(screen.getByRole("button", { name: "Keep" }));

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores a press on the confirmation while it is sending", async () => {
    const props = await open({ loading: true });

    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "Remove location" }));

    expect(props.onConfirm).not.toHaveBeenCalled();
  });
});
