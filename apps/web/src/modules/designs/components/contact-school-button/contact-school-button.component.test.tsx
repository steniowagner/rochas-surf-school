import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContactSchoolButton } from "./contact-school-button.component";

describe("ContactSchoolButton", () => {
  it("draws the primary button with the WhatsApp glyph", () => {
    const { container } = render(<ContactSchoolButton label="Falar com a escola" />);

    expect(screen.getByRole("button", { name: "Falar com a escola" })).toHaveClass("bg-sun");
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
