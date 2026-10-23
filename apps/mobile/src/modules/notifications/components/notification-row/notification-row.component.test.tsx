import { render, screen, userEvent } from "@testing-library/react-native";

import { Colors } from "@/constants/theme";

import { buildNotification, glyph } from "../../notifications.test-utils";

import { NotificationRow } from "./notification-row.component";

const NOW = new Date("2026-10-20T12:05:00.000Z");

const iconOf = () => screen.getByTestId("notification-row-icon");

describe("NotificationRow", () => {
  it("shows an unread enrolment.approved with its icon, title, body, time and dot", async () => {
    await render(
      <NotificationRow
        notification={buildNotification(1, {
          type: "enrolment.approved",
          title: "Request approved",
          body: "Your seat is confirmed.",
          createdAt: "2026-10-20T12:00:00.000Z",
        })}
        now={NOW}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Request approved")).toBeOnTheScreen();
    expect(screen.getByText("Your seat is confirmed.")).toBeOnTheScreen();
    expect(screen.getByText("5 minutes ago")).toBeOnTheScreen();
    expect(screen.getByTestId("notification-row-unread-dot")).toHaveProp(
      "className",
      expect.stringContaining("bg-sun"),
    );
    expect(iconOf()).toHaveProp("className", expect.stringContaining("bg-ok-tint"));
    expect(screen.getByText(glyph("checkmark-circle-outline"))).toHaveStyle({ color: Colors.light.ok });
    expect(
      screen.getByRole("button", {
        name: "Request approved, Your seat is confirmed., 5 minutes ago, unread",
      }),
    ).toBeOnTheScreen();
  });

  it("shows a read class.deleted with its icon and no dot", async () => {
    await render(
      <NotificationRow
        notification={buildNotification(2, { type: "class.deleted", title: "Class deleted", read: true })}
        now={NOW}
        onPress={jest.fn()}
      />,
    );

    expect(screen.queryByTestId("notification-row-unread-dot")).toBeNull();
    expect(iconOf()).toHaveProp("className", expect.stringContaining("bg-bad-tint"));
    expect(screen.getByText(glyph("trash-outline"))).toHaveStyle({ color: Colors.light.bad });
    expect(screen.getByRole("button").props.accessibilityLabel).not.toContain("unread");
  });

  it.each([
    ["class.reminder", "time-outline", "bg-warn-tint", Colors.light.warn],
    ["class.edited", "create-outline", "bg-info-tint", Colors.light.lagoon],
    ["broadcast.sent", "notifications-outline", "bg-info-tint", Colors.light.lagoon],
    ["toString", "notifications-outline", "bg-info-tint", Colors.light.lagoon],
  ] as const)("draws a %s with %s on %s", async (type, name, tile, color) => {
    await render(
      <NotificationRow notification={buildNotification(3, { type })} now={NOW} onPress={jest.fn()} />,
    );

    expect(iconOf()).toHaveProp("className", expect.stringContaining(tile));
    expect(screen.getByText(glyph(name))).toHaveStyle({ color });
  });

  it("shows the title and time only when the body is empty", async () => {
    await render(
      <NotificationRow
        notification={buildNotification(4, {
          type: "registration.denied",
          title: "Registration denied",
          body: "",
          read: true,
        })}
        now={NOW}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByRole("button").props.accessibilityLabel).toBe(
      "Registration denied, 5 minutes ago",
    );
  });

  it("says Now under a minute, and the date after a week", async () => {
    const { rerender } = await render(
      <NotificationRow
        notification={buildNotification(5, { createdAt: "2026-10-20T12:04:30.000Z" })}
        now={NOW}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText("Now")).toBeOnTheScreen();

    await rerender(
      <NotificationRow
        notification={buildNotification(5, { createdAt: "2026-10-01T12:00:00.000Z" })}
        now={NOW}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText("1 Oct")).toBeOnTheScreen();
  });

  it("shows no time for a date it can't read", async () => {
    await render(
      <NotificationRow
        notification={buildNotification(6, { title: "T", body: "B", createdAt: "nope", read: true })}
        now={NOW}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByRole("button").props.accessibilityLabel).toBe("T, B");
  });

  it("calls onPress with the notification", async () => {
    const notification = buildNotification(7, { title: "Class changed" });
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<NotificationRow notification={notification} now={NOW} onPress={onPress} />);

    await user.press(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledWith(notification);
  });
});
