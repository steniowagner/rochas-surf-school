import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CountryPicker } from "./country-picker.component";

describe("CountryPicker", () => {
  it("draws the title, the search field and a row per country with its dial code", () => {
    render(
      <CountryPicker
        title="País"
        searchPlaceholder="Buscar país"
        countries={[
          { code: "BR", name: "Brasil", dialCode: "+55" },
          { code: "PT", name: "Portugal", dialCode: "+351" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "País" })).toBeInTheDocument();
    expect(screen.getByText("Buscar país")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("+351")).toBeInTheDocument();
  });
});
