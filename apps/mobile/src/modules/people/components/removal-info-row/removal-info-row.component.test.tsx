import { render, screen } from "@testing-library/react-native";

import { RemovalInfoRow } from "./removal-info-row.component";

describe("RemovalInfoRow", () => {
  it("shows the text, in the muted color by default", async () => {
    await render(
      <RemovalInfoRow icon="close-circle-outline" text="Removed Oct 2" />,
    );

    expect(screen.getByText("Removed Oct 2")).toBeOnTheScreen();
    expect(screen.getByText("Removed Oct 2").props.className).toContain(
      "text-ink-2",
    );
  });

  it("draws the danger tone in the bad color", async () => {
    await render(
      <RemovalInfoRow
        icon="trash-outline"
        text="Permanently deleted on Nov 1"
        tone="danger"
      />,
    );

    expect(
      screen.getByText("Permanently deleted on Nov 1").props.className,
    ).toContain("text-bad");
  });
});
