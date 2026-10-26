import { render, screen, userEvent } from "@testing-library/react-native";

import { SendNoticeConfirmSheet } from "./send-notice-confirm-sheet.component";

const renderSheet = async (props: Partial<React.ComponentProps<typeof SendNoticeConfirmSheet>> = {}) => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  await render(
    <SendNoticeConfirmSheet
      visible
      audience="students"
      count={8}
      sending={false}
      onConfirm={onConfirm}
      onClose={onClose}
      {...props}
    />,
  );

  return { onConfirm, onClose, user: userEvent.setup() };
};

describe("SendNoticeConfirmSheet", () => {
  it("names the audience and the number of people", async () => {
    await renderSheet();

    expect(screen.getByText("Send this notice?")).toBeOnTheScreen();
    expect(screen.getByText("Audience: Students. 8 people will receive it.")).toBeOnTheScreen();
  });

  it("uses the singular for one person", async () => {
    await renderSheet({ audience: "instructors", count: 1 });

    expect(screen.getByText("Audience: Instructors. 1 person will receive it.")).toBeOnTheScreen();
  });

  it("confirms and cancels", async () => {
    const { onConfirm, onClose, user } = await renderSheet();

    await user.press(screen.getByRole("button", { name: "Send now" }));
    await user.press(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables Cancel while sending", async () => {
    await renderSheet({ sending: true });

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
