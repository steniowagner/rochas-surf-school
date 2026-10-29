import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RemovalInfoRow } from "./removal-info-row.component";

describe("RemovalInfoRow", () => {
  it("draws the text beside its tinted tile", () => {
    render(<RemovalInfoRow icon="Ionicons:close-circle-outline" text="Removida em 2 set" />);

    expect(screen.getByText("Removida em 2 set")).toHaveClass("text-ink-2");
  });

  it("draws what can't be undone in bad", () => {
    render(<RemovalInfoRow icon="Ionicons:trash-outline" text="Exclusão definitiva em 2 out" tone="danger" />);

    expect(screen.getByText("Exclusão definitiva em 2 out")).toHaveClass("text-bad");
  });
});
