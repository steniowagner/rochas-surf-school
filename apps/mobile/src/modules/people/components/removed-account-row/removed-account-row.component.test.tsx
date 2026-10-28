import {
  render,
  screen,
  userEvent,
  within,
} from "@testing-library/react-native";

import { RemovedAccount } from "../../people.types";

import { RemovedAccountRow } from "./removed-account-row.component";
import { RemovedAccountRowProps } from "./removed-account-row.types";

const ACCOUNT: RemovedAccount = {
  id: "r-1",
  name: "Bia Souza",
  role: "instructor",
  whatsappNumber: null,
  removedAt: "2026-10-02T15:00:00.000Z",
};

const setup = async (overrides: Partial<RemovedAccountRowProps> = {}) => {
  const props: RemovedAccountRowProps = {
    account: ACCOUNT,
    onPress: jest.fn(),
    onRestore: jest.fn(),
    isRestoring: false,
    disabled: false,
    ...overrides,
  };

  await render(<RemovedAccountRow {...props} />);

  return { props, user: userEvent.setup() };
};

describe("RemovedAccountRow", () => {
  it("shows the initials, the name, the role chip, when it was removed and the day it is deleted for good", async () => {
    await setup();

    expect(screen.getByText("BS")).toBeOnTheScreen();
    expect(screen.getByText("Bia Souza")).toBeOnTheScreen();
    expect(screen.getByText("Instructor")).toBeOnTheScreen();
    expect(screen.getByText("Removed Oct 2")).toBeOnTheScreen();
    expect(screen.getByText("Permanently deleted on Nov 1")).toBeOnTheScreen();
  });

  it.each([
    ["student", "Student"],
    ["admin", "Admin"],
  ] as const)("labels a %s", async (role, label) => {
    await setup({ account: { ...ACCOUNT, role } });

    expect(screen.getByText(label)).toBeOnTheScreen();
  });

  it("calls onPress with the account from the name row", async () => {
    const { props, user } = await setup();

    await user.press(screen.getByRole("button", { name: "Bia Souza" }));

    expect(props.onPress).toHaveBeenCalledWith(ACCOUNT);
    expect(props.onRestore).not.toHaveBeenCalled();
  });

  it("calls onRestore with the account from Restore", async () => {
    const { props, user } = await setup();

    await user.press(screen.getByRole("button", { name: "Restore Bia Souza" }));

    expect(props.onRestore).toHaveBeenCalledWith(ACCOUNT);
    expect(props.onPress).not.toHaveBeenCalled();
  });

  it("swaps the Restore label for the spinner while it restores, and ignores presses", async () => {
    const { props, user } = await setup({ isRestoring: true });
    const restore = screen.getByRole("button", { name: "Restore Bia Souza" });

    expect(within(restore).queryByText("Restore")).not.toBeOnTheScreen();

    await user.press(restore);

    expect(props.onRestore).not.toHaveBeenCalled();
  });

  it("disables Restore while another account is being restored", async () => {
    const { props, user } = await setup({ disabled: true });
    const restore = screen.getByRole("button", { name: "Restore Bia Souza" });

    expect(restore).toBeDisabled();
    expect(within(restore).getByText("Restore")).toBeOnTheScreen();

    await user.press(restore);

    expect(props.onRestore).not.toHaveBeenCalled();
  });
});
