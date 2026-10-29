import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GuestsWarning } from "./guests-warning.component";

describe("GuestsWarning", () => {
  it("warns that the trial guests won't be told", () => {
    render(<GuestsWarning locale="pt-br" count={2} />);

    expect(screen.getByText("2 alunos trial não têm conta e não recebem o aviso — fale com eles por WhatsApp.")).toBeInTheDocument();
  });

  it("is left out without guests", () => {
    const { container } = render(<GuestsWarning locale="pt-br" count={0} />);

    expect(container).toBeEmptyDOMElement();
  });
});
