import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextArea } from "./text-area.component";

describe("TextArea", () => {
  it("shows the label, the placeholder of an empty field and its counter", () => {
    render(<TextArea value="" maxLength={200} label="Motivo" placeholder="Conte o motivo" />);

    expect(screen.getByText("Motivo")).toBeInTheDocument();
    expect(screen.getByText("Conte o motivo")).toHaveClass("text-ink-2");
    expect(screen.getByText("0/200")).toBeInTheDocument();
  });

  it("shows the text and counts it", () => {
    render(<TextArea value="Sem vagas agora" maxLength={15} />);

    expect(screen.getByText("Sem vagas agora")).toHaveClass("text-ink");
    expect(screen.getByText("15/15")).toBeInTheDocument();
  });
});
