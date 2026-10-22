import { render, screen, userEvent } from "@testing-library/react-native";

import { glyph } from "../../classes.test-utils";

import { ClassToolCard } from "./class-tool-card.component";

jest.useFakeTimers();

// The card's surface: the view around the title and subtitle.
const surfaceOf = (title: string) => screen.getByText(title).parent!.parent!;

describe("ClassToolCard", () => {
  it("shows the icon, the title and the subtitle, and is one button", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <ClassToolCard
        icon="pencil-outline"
        title="Edit class"
        subtitle="Date, time, place…"
        onPress={onPress}
      />,
    );

    expect(screen.getByText(glyph("pencil-outline"))).toBeOnTheScreen();
    expect(screen.getByText("Edit class").props.className).toContain(
      "text-ink",
    );
    expect(screen.getByText("Date, time, place…")).toBeOnTheScreen();

    const card = screen.getByRole("button", { name: "Edit class" });
    expect(surfaceOf("Edit class").props.className).toContain("bg-surface");
    expect(card).toBeEnabled();

    await user.press(card);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("draws the danger tone on bad-tint, with the title in bad", async () => {
    await render(
      <ClassToolCard
        icon="close-circle-outline"
        title="Cancel class"
        subtitle="Notifies 2 people"
        tone="danger"
      />,
    );

    expect(surfaceOf("Cancel class").props.className).toContain("bg-bad-tint");
    expect(screen.getByText("Cancel class").props.className).toContain(
      "text-bad",
    );
  });

  it("is faded, marked disabled and does nothing when disabled", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <ClassToolCard
        icon="trash-outline"
        title="Delete class"
        subtitle="Has people enrolled"
        disabled
        onPress={onPress}
      />,
    );

    const card = screen.getByRole("button", { name: "Delete class" });
    expect(card).toBeDisabled();
    expect(surfaceOf("Delete class").props.className).toContain("opacity-50");

    await user.press(card);

    expect(onPress).not.toHaveBeenCalled();
  });
});
