import { render, screen } from "@testing-library/react-native";

import { Chip } from "./chip.component";
import { ChipTone } from "./chip.types";

describe("Chip", () => {
  it("renders the label with the default tone", async () => {
    await render(<Chip>Beginner</Chip>);

    expect(screen.getByText("Beginner")).toBeOnTheScreen();
  });

  it.each<ChipTone>([
    "surf",
    "skate",
    "info",
    "sun",
    "grape",
    "warn",
    "ok",
    "bad",
    "muted",
    "onHighlight",
  ])("renders the %s tone", async (tone) => {
    await render(<Chip tone={tone}>Label</Chip>);

    expect(screen.getByText("Label")).toBeOnTheScreen();
  });
});
