import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassRequestsSkeleton } from "./class-requests-skeleton.component";

describe("ClassRequestsSkeleton", () => {
  it("is read out as one loading state, drawn with skeletons", () => {
    render(<ClassRequestsSkeleton locale="pt-br" />);

    expect(screen.getByRole("status", { name: "Carregando os pedidos" })).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(20);
  });
});
