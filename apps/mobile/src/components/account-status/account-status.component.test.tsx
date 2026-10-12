import { render, screen, userEvent } from "@testing-library/react-native";

import { Button } from "@/components/ui/button";

import { AccountStatus } from "./account-status.component";
import { AccountStatusProps } from "./account-status.types";

const baseProps: AccountStatusProps = {
  tone: "bad",
  icon: "close",
  eyebrow: "Registration not approved",
  title: "Not this time",
  description: "The team didn't approve it.",
  onUseAnotherEmail: jest.fn(),
};

const renderStatus = (props: Partial<AccountStatusProps> = {}) =>
  render(<AccountStatus {...baseProps} {...props} />);

beforeEach(() => {
  jest.mocked(baseProps.onUseAnotherEmail).mockReset();
});

describe("AccountStatus", () => {
  it("shows the eyebrow, title, description and the secondary button", async () => {
    await renderStatus();

    expect(screen.getByText("Registration not approved")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Not this time" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("The team didn't approve it.")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Use another email" }),
    ).toBeOnTheScreen();
  });

  it("renders the note card only when given", async () => {
    const { rerender } = await renderStatus();

    expect(screen.queryByText("Message from the team")).not.toBeOnTheScreen();

    await rerender(
      <AccountStatus
        {...baseProps}
        note={{ title: "Message from the team", text: "Line 1\nLine é" }}
      />,
    );

    expect(screen.getByText("Message from the team")).toBeOnTheScreen();
    expect(screen.getByText("Line 1\nLine é")).toBeOnTheScreen();
  });

  it.each(["bad", "dim", "sand"] as const)(
    "renders the %s tone",
    async (tone) => {
      await renderStatus({ tone });

      expect(screen.getByText("Not this time")).toBeOnTheScreen();
    },
  );

  it("renders the primary action only when given", async () => {
    const { rerender } = await renderStatus();

    expect(screen.queryByRole("button", { name: "Go" })).not.toBeOnTheScreen();

    await rerender(
      <AccountStatus
        {...baseProps}
        primaryAction={<Button loading>Go</Button>}
      />,
    );

    // A loading button shows a spinner instead of its label, and keeps its accessible name.
    expect(screen.getByRole("button", { name: "Go" })).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Use another email" }),
    ).toBeOnTheScreen();
  });

  it("calls onUseAnotherEmail when the secondary button is pressed", async () => {
    await renderStatus();

    await userEvent.press(
      screen.getByRole("button", { name: "Use another email" }),
    );

    expect(baseProps.onUseAnotherEmail).toHaveBeenCalledTimes(1);
  });
});
