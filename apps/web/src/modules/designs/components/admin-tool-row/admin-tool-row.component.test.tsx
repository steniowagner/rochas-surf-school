import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AdminToolRow } from "./admin-tool-row.component";

describe("AdminToolRow", () => {
  it("shows the title, the subtitle and the count that waits", () => {
    render(<AdminToolRow icon="MaterialCommunityIcons:account-plus-outline" title="Entrar na escola" subtitle="Aprove contas novas" badge={3} />);

    expect(screen.getByRole("button", { name: "Entrar na escola" })).toBeInTheDocument();
    expect(screen.getByText("Aprove contas novas")).toBeInTheDocument();
    expect(screen.getByTestId("admin-tool-row-badge")).toHaveTextContent("3");
  });

  it("shows no count when nothing waits or the count is unknown", () => {
    const { rerender } = render(<AdminToolRow icon="MaterialCommunityIcons:account-plus-outline" title="Entrar na escola" badge={0} />);

    expect(screen.queryByTestId("admin-tool-row-badge")).toBeNull();
    rerender(<AdminToolRow icon="MaterialCommunityIcons:account-plus-outline" title="Entrar na escola" />);
    expect(screen.queryByTestId("admin-tool-row-badge")).toBeNull();
  });

  it("keeps a row without a subtitle as tall as the others, its title centered over two blank lines", () => {
    const { container } = render(<AdminToolRow grouped="next" icon="MaterialCommunityIcons:plus-circle-outline" title="Criar aulas" />);

    expect(screen.getByText("Criar aulas")).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"].opacity-0')?.children).toHaveLength(2);
    expect(container.firstElementChild).toHaveClass("border-t");
  });
});
