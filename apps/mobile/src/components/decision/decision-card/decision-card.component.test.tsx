import { render, screen, userEvent } from "@testing-library/react-native";

import { DecisionCard } from "./decision-card.component";
import { DecisionCardProps } from "./decision-card.types";

jest.useFakeTimers();

async function setup(overrides: Partial<DecisionCardProps> = {}) {
  const props: DecisionCardProps = {
    title: "Ana Souza",
    details: ["ana@example.com", "Asked 2 hours ago"],
    initials: "AS",
    approveLabel: "Approve",
    denyLabel: "Deny",
    onApprove: jest.fn(),
    onDeny: jest.fn(),
    disabled: false,
    ...overrides,
  };

  await render(<DecisionCard {...props} />);

  return { props };
}

describe("DecisionCard", () => {
  it("shows the initials, the title and every detail", async () => {
    await setup({ subtitle: "Student" });

    expect(screen.getByText("AS")).toBeOnTheScreen();
    expect(screen.getByText("Ana Souza")).toBeOnTheScreen();
    expect(screen.getByText("Student")).toBeOnTheScreen();
    expect(screen.getByText("ana@example.com")).toBeOnTheScreen();
    expect(screen.getByText("Asked 2 hours ago")).toBeOnTheScreen();
  });

  it("omits the subtitle when there is none", async () => {
    await setup();

    expect(screen.queryByText("Student")).toBeNull();
  });

  it("calls the callbacks of the pressed button", async () => {
    const user = userEvent.setup();
    const { props } = await setup();

    await user.press(screen.getByRole("button", { name: "Approve" }));
    expect(props.onApprove).toHaveBeenCalledTimes(1);
    expect(props.onDeny).not.toHaveBeenCalled();

    await user.press(screen.getByRole("button", { name: "Deny" }));
    expect(props.onDeny).toHaveBeenCalledTimes(1);
  });

  it("ignores presses on both buttons while disabled", async () => {
    const user = userEvent.setup();
    const { props } = await setup({ disabled: true });

    await user.press(screen.getByRole("button", { name: "Approve" }));
    await user.press(screen.getByRole("button", { name: "Deny" }));

    expect(props.onApprove).not.toHaveBeenCalled();
    expect(props.onDeny).not.toHaveBeenCalled();
  });

  it.each([
    ["approve", "Approve"],
    ["deny", "Deny"],
  ] as const)(
    "shows %s as loading and ignores its presses",
    async (loading, name) => {
      const user = userEvent.setup();
      const { props } = await setup({ disabled: true, loading });

      const button = screen.getByRole("button", { name });
      await user.press(button);

      expect(screen.queryByText(name)).toBeNull();
      expect(props.onApprove).not.toHaveBeenCalled();
      expect(props.onDeny).not.toHaveBeenCalled();
    },
  );
});
