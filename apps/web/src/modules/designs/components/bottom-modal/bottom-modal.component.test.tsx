import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BottomModal } from "./bottom-modal.component";

describe("BottomModal", () => {
  it("draws a veil with a sheet on the page color, its top corners rounded and a handle", () => {
    render(<BottomModal><p>conteúdo</p></BottomModal>);

    expect(screen.getByTestId("bottom-modal-scrim")).toHaveClass("bg-scrim");
    expect(screen.getByRole("dialog")).toHaveClass("bg-page", "rounded-t-sheet");
    expect(screen.getByTestId("bottom-modal-handle")).toHaveClass("bg-line");
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});
