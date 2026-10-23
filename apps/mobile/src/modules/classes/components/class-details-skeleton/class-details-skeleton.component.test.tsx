import { render, screen } from "@testing-library/react-native";

import { ClassDetailsSkeleton } from "./class-details-skeleton.component";

describe("ClassDetailsSkeleton", () => {
  it("draws the details' blocks with no text in them", async () => {
    await render(<ClassDetailsSkeleton />);

    expect(screen.getByTestId("class-details-skeleton")).toBeOnTheScreen();
    expect(screen.queryByText(/./)).not.toBeOnTheScreen();
  });
});
