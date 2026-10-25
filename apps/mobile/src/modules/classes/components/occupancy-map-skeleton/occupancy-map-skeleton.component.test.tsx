import { render, screen } from "@testing-library/react-native";

import { OccupancyMapSkeleton } from "./occupancy-map-skeleton.component";

describe("OccupancyMapSkeleton", () => {
  it("is one element labelled as loading, with no text in it", async () => {
    await render(<OccupancyMapSkeleton />);

    const skeleton = screen.getByTestId("occupancy-map-skeleton");
    expect(skeleton.props.accessible).toBe(true);
    expect(skeleton.props.accessibilityLabel).toBe("Loading the occupancy");
    expect(screen.queryByText(/./)).not.toBeOnTheScreen();
  });
});
