import { render, screen, userEvent, within } from "@testing-library/react-native";

import { SendNoticeConfirmSheet } from "./send-notice-confirm-sheet.component";

const renderSheet = async (props: Partial<React.ComponentProps<typeof SendNoticeConfirmSheet>> = {}) => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  await render(
    <SendNoticeConfirmSheet
      visible
      audience="students"
      count={8}
      title="Big swell tomorrow"
      message={"No beginner classes.\nSee you on Monday."}
      sending={false}
      onConfirm={onConfirm}
      onClose={onClose}
      {...props}
    />,
  );

  return { onConfirm, onClose, user: userEvent.setup() };
};

describe("SendNoticeConfirmSheet", () => {
  it("asks to send to the number of people and says who they are", async () => {
    await renderSheet();

    expect(screen.getByRole("header", { name: "Send to 8 people?" })).toBeOnTheScreen();
    expect(
      screen.getByText("All students get a notification. Once it's sent, it can't be deleted."),
    ).toBeOnTheScreen();
  });

  it("uses the singular for one person", async () => {
    await renderSheet({ count: 1 });

    expect(screen.getByRole("header", { name: "Send to 1 person?" })).toBeOnTheScreen();
  });

  it.each([
    ["all", "Everyone — students, instructors and admins — gets a notification. Once it's sent, it can't be deleted."],
    ["instructors", "All instructors get a notification. Once it's sent, it can't be deleted."],
  ] as const)("names the %s audience", async (audience, description) => {
    await renderSheet({ audience });

    expect(screen.getByText(description)).toBeOnTheScreen();
  });

  it("shows the notice as it will be sent", async () => {
    await renderSheet();

    const preview = screen.getByTestId("notice-preview");
    expect(within(preview).getByText("Big swell tomorrow")).toBeOnTheScreen();
    expect(within(preview).getByText("No beginner classes.\nSee you on Monday.")).toBeOnTheScreen();
  });

  it("confirms, and goes back to editing", async () => {
    const { onConfirm, onClose, user } = await renderSheet();

    await user.press(screen.getByRole("button", { name: "Yes, send" }));
    await user.press(screen.getByRole("button", { name: "Back to editing" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables going back while sending", async () => {
    await renderSheet({ sending: true });

    expect(screen.getByRole("button", { name: "Back to editing" })).toBeDisabled();
  });
});
