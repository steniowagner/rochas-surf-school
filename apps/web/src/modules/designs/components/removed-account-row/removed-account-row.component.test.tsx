import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RemovedAccountRow } from "./removed-account-row.component";

describe("RemovedAccountRow", () => {
  it("draws the account, when it was removed, when it goes for good, and the restore button", () => {
    render(<RemovedAccountRow locale="pt-br" name="Marcos Lima" role="instructor" removedOn="2 de set." deletedOn="2 de out." />);

    expect(screen.getByRole("button", { name: "Marcos Lima" })).toBeInTheDocument();
    expect(screen.getByText("Instrutor")).toBeInTheDocument();
    expect(screen.getByText("Removida em 2 de set.")).toBeInTheDocument();
    expect(screen.getByText("Exclusão definitiva em 2 de out.")).toHaveClass("text-bad");
    expect(screen.getByRole("button", { name: "Restaurar" })).toBeInTheDocument();
  });
});
