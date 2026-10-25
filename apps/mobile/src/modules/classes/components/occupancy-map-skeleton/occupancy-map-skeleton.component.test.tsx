import { render, screen } from "@testing-library/react-native";

import { OccupancyMapSkeleton } from "./occupancy-map-skeleton.component";

describe("OccupancyMapSkeleton", () => {
  it("is one element labelled as loading, with the stats card in it and no text", async () => {
    await render(<OccupancyMapSkeleton />);

    const skeleton = screen.getByTestId("occupancy-map-skeleton");
    expect(skeleton.props.accessible).toBe(true);
    expect(skeleton.props.accessibilityLabel).toBe("Loading the occupancy");
    expect(screen.getByTestId("occupancy-stats-skeleton")).toBeOnTheScreen();
    expect(screen.queryByText(/./)).not.toBeOnTheScreen();
  });
});
