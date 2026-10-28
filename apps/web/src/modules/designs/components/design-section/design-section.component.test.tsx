import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DesignSection } from "./design-section.component";

describe("DesignSection", () => {
  it("prints the number and title and names the section after them", () => {
    render(<DesignSection number="04" title="Controles" description="Os controles.">x</DesignSection>);

    expect(screen.getByRole("region", { name: "04 — Controles" })).toBeInTheDocument();
    expect(screen.getByText("Os controles.")).toBeInTheDocument();
  });

  it("omits the description when there is none", () => {
    render(<DesignSection number="01" title="Cor">x</DesignSection>);

    expect(screen.queryByText("Os controles.")).toBeNull();
  });
});
