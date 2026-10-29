import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PhoneNumberField } from "./phone-number-field.component";

describe("PhoneNumberField", () => {
  it("shows the country button with its dial code and the number", () => {
    render(<PhoneNumberField country="BR" dialCode="+55" value="85 91234-5678" />);

    expect(screen.getByText("BR +55")).toBeInTheDocument();
    expect(screen.getByText("85 91234-5678")).toBeInTheDocument();
  });

  it("shows the error message under the number", () => {
    render(<PhoneNumberField country="BR" dialCode="+55" value="85" status="error" errorMessage="Número inválido." />);

    expect(screen.getByText("Número inválido.")).toHaveClass("text-bad");
  });
});
