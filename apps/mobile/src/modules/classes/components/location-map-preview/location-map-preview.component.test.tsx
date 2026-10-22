import { render, screen } from "@testing-library/react-native";

import { LocationMapPreview } from "./location-map-preview.component";

const POINT = { latitude: -3.7442, longitude: -38.4617 };

describe("LocationMapPreview", () => {
  it("shows a fixed map centred on the point with its marker", async () => {
    await render(<LocationMapPreview point={POINT} />);
    const map = screen.getByTestId("location-map-preview");

    expect(map.props.initialRegion).toMatchObject(POINT);
    expect(map.props).toMatchObject({
      scrollEnabled: false,
      zoomEnabled: false,
      rotateEnabled: false,
      pitchEnabled: false,
    });
    expect(screen.getByTestId("location-map-preview").children).toHaveLength(1);
  });
});
