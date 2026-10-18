import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";

import { LocationMapPreview } from "./location-map-preview.component";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const POINT = { latitude: -3.7442, longitude: -38.4617 };
const original = Platform.OS;

afterEach(() => {
  Platform.OS = original;
  jest.restoreAllMocks();
  mockShow.mockClear();
});

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

  it.each([
    ["ios", "https://maps.apple.com/?daddr=-3.7442,-38.4617"],
    ["android", "https://www.google.com/maps/dir/?api=1&destination=-3.7442,-38.4617"],
  ] as const)("opens the directions for %s", async (os, url) => {
    Platform.OS = os;
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await render(<LocationMapPreview point={POINT} />);

    await userEvent.setup().press(screen.getByRole("button", { name: "Directions" }));

    expect(openURL).toHaveBeenCalledWith(url);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("says the map could not be opened when the link fails", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no app"));
    await render(<LocationMapPreview point={POINT} />);

    await userEvent.setup().press(screen.getByRole("button", { name: "Directions" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Couldn't open the map."));
  });
});
