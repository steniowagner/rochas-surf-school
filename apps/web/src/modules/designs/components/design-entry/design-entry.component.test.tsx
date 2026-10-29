import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DesignEntry } from "./design-entry.component";

describe("DesignEntry", () => {
  it("carries the inventory id as data-design-id and prints it with the title and note", () => {
    const { container } = render(
      <DesignEntry id="DS-04-01" title="Botão" note="Oito variantes.">samples</DesignEntry>,
    );

    expect(container.querySelector('[data-design-id="DS-04-01"]')).not.toBeNull();
    expect(screen.getByText("DS-04-01")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Botão" })).toBeInTheDocument();
    expect(screen.getByText("Oito variantes.")).toBeInTheDocument();
    expect(screen.getByText("samples")).toBeInTheDocument();
  });

  it("carries the inventory id as the element id, so a URL can point at the frame", () => {
    const { container } = render(<DesignEntry id="ST-05-07" title="Agenda">x</DesignEntry>);

    expect(container.querySelector("article")?.id).toBe("ST-05-07");
  });

  it("omits the note when there is none", () => {
    render(<DesignEntry id="DS-04-02" title="Header">x</DesignEntry>);

    expect(screen.queryByText("Oito variantes.")).toBeNull();
  });
});
