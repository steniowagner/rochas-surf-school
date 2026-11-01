import { render, screen, userEvent } from "@testing-library/react-native";

import type { ClassMessageItem } from "../../classes.types";

import { ClassMessages } from "./class-messages.component";

const NOW = new Date("2026-10-31T15:00:00.000Z");

const build = (id: string, overrides: Partial<ClassMessageItem> = {}): ClassMessageItem => ({
  id,
  title: `Title ${id}`,
  message: `Text ${id}`,
  createdAt: "2026-10-31T13:24:00.000Z",
  sender: null,
  ...overrides,
});

describe("ClassMessages", () => {
  it("shows the count, and each message's title, text and time, in the order given", async () => {
    await render(
      <ClassMessages
        messages={[build("1"), build("2", { createdAt: "2026-10-29T15:00:00.000Z" })]}
        now={NOW}
        onOpenMessage={jest.fn()}
      />,
    );

    expect(screen.getByText("Messages for this class · 2")).toBeOnTheScreen();
    expect(screen.getByText("Title 1")).toBeOnTheScreen();
    expect(screen.getByText("Text 1")).toBeOnTheScreen();
    expect(screen.getByText("10:24")).toBeOnTheScreen();
    expect(screen.getByText("Thu")).toBeOnTheScreen();
    expect(screen.getAllByRole("button").map((row) => row.props.accessibilityLabel ?? "")).toHaveLength(2);
  });

  it("shows at most 2 lines of title and of text", async () => {
    await render(<ClassMessages messages={[build("1")]} now={NOW} onOpenMessage={jest.fn()} />);

    expect(screen.getByText("Title 1")).toHaveProp("numberOfLines", 2);
    expect(screen.getByText("Text 1")).toHaveProp("numberOfLines", 2);
  });

  it("opens the pressed message", async () => {
    const onOpenMessage = jest.fn();
    const second = build("2");
    await render(<ClassMessages messages={[build("1"), second]} now={NOW} onOpenMessage={onOpenMessage} />);

    await userEvent.setup().press(screen.getByText("Title 2"));

    expect(onOpenMessage).toHaveBeenCalledWith(second);
  });
});
