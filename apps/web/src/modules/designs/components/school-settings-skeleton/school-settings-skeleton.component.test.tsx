import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SchoolSettingsSkeleton } from "./school-settings-skeleton.component";

describe("SchoolSettingsSkeleton", () => {
  it("is read out as one loading state, drawn with skeletons", () => {
    render(<SchoolSettingsSkeleton locale="pt-br" />);

    expect(screen.getByRole("status", { name: "Carregando as configurações" })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(8);
  });
});
