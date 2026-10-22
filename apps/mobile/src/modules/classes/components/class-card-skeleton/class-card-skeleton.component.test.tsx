import { render, screen } from "@testing-library/react-native";

import { ClassCardSkeleton } from "./class-card-skeleton.component";

describe("ClassCardSkeleton", () => {
  it("draws the card's box with no text in it", async () => {
    await render(<ClassCardSkeleton />);

    const card = screen.getByTestId("class-card-skeleton");
    expect(card.props.className).toContain("rounded-card");
    expect(card.props.className).toContain("bg-surface");
    expect(screen.queryByText(/./)).not.toBeOnTheScreen();
  });
});
