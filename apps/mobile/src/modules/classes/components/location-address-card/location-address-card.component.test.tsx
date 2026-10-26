import { render, screen } from "@testing-library/react-native";

import i18n from "@/i18n";

import { LocationAddressCard } from "./location-address-card.component";

const POINT = { latitude: -3.7442, longitude: -38.4617 };
const TAPPED = { latitude: -3.72, longitude: -38.51 };

describe("LocationAddressCard", () => {
  it("shows the hint before any point", async () => {
    await render(
      <LocationAddressCard
        place={null}
        resolving={false}
        pendingPoint={null}
      />,
    );

    expect(screen.getByText("Tap the map to mark the point")).toBeTruthy();
    expect(
      screen.getByTestId("location-address-card").props.className,
    ).toContain("border-dashed");
  });

  it("shows the hint in Portuguese", async () => {
    await i18n.changeLanguage("pt-BR");
    await render(
      <LocationAddressCard
        place={null}
        resolving={false}
        pendingPoint={null}
      />,
    );

    expect(screen.getByText("Toque no mapa para marcar o ponto")).toBeTruthy();
  });

  it("shows a point picked on the map with its address and coordinates", async () => {
    await render(
      <LocationAddressCard
        place={{ point: POINT, address: "Av. Zezé Diogo, 5000", name: null }}
        resolving={false}
        pendingPoint={null}
      />,
    );

    expect(screen.getByText("Av. Zezé Diogo, 5000")).toBeTruthy();
    expect(
      screen.getByText("Point picked on the map · -3.7442, -38.4617"),
    ).toBeTruthy();
    expect(screen.queryByText("Tap the map to mark the point")).toBeNull();
    // The empty card's dashed border must not survive on Android.
    expect(
      screen.getByTestId("location-address-card").props.className,
    ).toContain("border-solid");
  });

  it("shows a suggestion or a labelled place with its name and coordinates", async () => {
    await i18n.changeLanguage("pt-BR");
    await render(
      <LocationAddressCard
        place={{
          point: POINT,
          address: "Av. Zezé Diogo, 5000",
          name: "Praia do Futuro",
        }}
        resolving={false}
        pendingPoint={null}
      />,
    );

    expect(screen.getByText("Av. Zezé Diogo, 5000")).toBeTruthy();
    expect(
      screen.getByText("Praia do Futuro · -3.7442, -38.4617"),
    ).toBeTruthy();
  });

  it("says the address is looked up, with the tapped point, while a tap resolves", async () => {
    await render(
      <LocationAddressCard
        place={{ point: POINT, address: "Old", name: "Praia do Futuro" }}
        resolving
        pendingPoint={TAPPED}
      />,
    );

    expect(screen.getByText("Looking up the address…")).toBeTruthy();
    expect(
      screen.getByText("Point picked on the map · -3.7200, -38.5100"),
    ).toBeTruthy();
    expect(screen.queryByText("Old")).toBeNull();
  });

  it("says the address is looked up, without coordinates, for a first suggestion", async () => {
    await render(
      <LocationAddressCard place={null} resolving pendingPoint={null} />,
    );

    expect(screen.getByText("Looking up the address…")).toBeTruthy();
    expect(screen.queryByText(/·/)).toBeNull();
  });
});
