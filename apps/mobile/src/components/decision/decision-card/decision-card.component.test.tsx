import { render, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";

import { DecisionCard } from "./decision-card.component";
import { DecisionCardProps } from "./decision-card.types";

jest.useFakeTimers();

async function setup(overrides: Partial<DecisionCardProps> = {}) {
  const props: DecisionCardProps = {
    title: "Ana Souza",
    details: ["ana@example.com", "Asked 2 hours ago"],
    avatar: <Text>AS</Text>,
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
  it("shows the avatar, the title and every detail", async () => {
    await setup({ subtitle: "Student" });

    expect(screen.getByText("AS")).toBeOnTheScreen();
    expect(screen.getByText("Ana Souza")).toBeOnTheScreen();
    expect(screen.getByText("Student")).toBeOnTheScreen();
    expect(screen.getByText("ana@example.com")).toBeOnTheScreen();
    expect(screen.getByText("Asked 2 hours ago")).toBeOnTheScreen();
  });

  it("makes the upper row pressable when onPress is given", async () => {
    const user = userEvent.setup();
    const { props } = await setup({ onPress: jest.fn() });

    await user.press(screen.getByRole("button", { name: "Ana Souza" }));

    expect(props.onPress).toHaveBeenCalledTimes(1);
    expect(props.onApprove).not.toHaveBeenCalled();
    expect(props.onDeny).not.toHaveBeenCalled();
  });

  it("has no pressable row and no chevron without onPress", async () => {
    await setup();

    expect(screen.queryByRole("button", { name: "Ana Souza" })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("omits the subtitle when there is none", async () => {
    await setup();

    expect(screen.queryByText("Student")).toBeNull();
  });

  it("calls the callbacks of the pressed button", async () => {
    const user = userEvent.setup();
    const { props } = await setup({ onPress: jest.fn() });

    await user.press(screen.getByRole("button", { name: "Approve" }));
    expect(props.onApprove).toHaveBeenCalledTimes(1);
    expect(props.onDeny).not.toHaveBeenCalled();
    expect(props.onPress).not.toHaveBeenCalled();

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

  it("disables the approve button alone with approveDisabled", async () => {
    const user = userEvent.setup();
    const { props } = await setup({ approveDisabled: true });

    await user.press(screen.getByRole("button", { name: "Approve" }));
    await user.press(screen.getByRole("button", { name: "Deny" }));

    expect(props.onApprove).not.toHaveBeenCalled();
    expect(props.onDeny).toHaveBeenCalledTimes(1);
  });
});
