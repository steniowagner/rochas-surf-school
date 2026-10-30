import { render, screen } from "@testing-library/react-native";

import { LocationSummaryCard } from "./location-summary-card.component";

describe("LocationSummaryCard", () => {
  it("shows the title over the subtitle", async () => {
    await render(
      <LocationSummaryCard
        title="Praia do Futuro"
        subtitle="Av. Zezé Diogo, 5000"
      />,
    );

    expect(screen.getByText("Praia do Futuro")).toBeTruthy();
    expect(screen.getByText("Av. Zezé Diogo, 5000")).toBeTruthy();
  });
});
