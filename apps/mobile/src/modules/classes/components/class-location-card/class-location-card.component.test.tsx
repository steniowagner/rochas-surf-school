import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { Linking, Platform } from "react-native";

import { ClassLocationCard } from "./class-location-card.component";

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

describe("ClassLocationCard", () => {
  it("shows the map, then the name, the address and Directions", async () => {
    await render(<ClassLocationCard name="Praia do Futuro" address="Av. Zezé Diogo, 1000" point={POINT} />);

    expect(screen.getByTestId("location-map-preview").props.initialRegion).toMatchObject(POINT);
    expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
    expect(screen.getByText("Av. Zezé Diogo, 1000")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Directions" })).toBeOnTheScreen();
  });

  it("shows the name and the address alone for a location without a point", async () => {
    await render(<ClassLocationCard name="Antigo" address="Rua A" point={null} />);

    expect(screen.getByText("Antigo")).toBeOnTheScreen();
    expect(screen.getByText("Rua A")).toBeOnTheScreen();
    expect(screen.queryByTestId("location-map-preview")).toBeNull();
    expect(screen.queryByRole("button", { name: "Directions" })).toBeNull();
  });

  it.each([
    ["ios", "https://maps.apple.com/?daddr=-3.7442,-38.4617"],
    ["android", "https://www.google.com/maps/dir/?api=1&destination=-3.7442,-38.4617"],
  ] as const)("opens the directions for %s", async (os, url) => {
    Platform.OS = os;
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await render(<ClassLocationCard name="Praia do Futuro" address="Av. Zezé Diogo, 1000" point={POINT} />);

    await userEvent.setup().press(screen.getByRole("button", { name: "Directions" }));

    expect(openURL).toHaveBeenCalledWith(url);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("says the map could not be opened when the link fails", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no app"));
    await render(<ClassLocationCard name="Praia do Futuro" address="Av. Zezé Diogo, 1000" point={POINT} />);

    await userEvent.setup().press(screen.getByRole("button", { name: "Directions" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Couldn't open the map."));
  });
});
