import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConfirmCodeScreen } from "./confirm-code-screen.component";

describe("ConfirmCodeScreen", () => {
  it("draws the empty boxes, the countdown and the not-received card (AF-02-10)", () => {
    render(<ConfirmCodeScreen locale="en" state="counting" />);

    expect(screen.getByRole("heading", { name: "Confirm your email" })).toBeInTheDocument();
    expect(screen.getByText("ana.lima@email.com")).toHaveClass("font-extrabold");
    expect(screen.getAllByTestId("otp-box").map((box) => box.textContent)).toEqual(["", "", "", "", "", ""]);
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByText("Resend code in 0:24")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "change the email" })).toBeInTheDocument();
  });

  it("draws the typed code and the resend link in place of the countdown (AF-02-11)", () => {
    render(<ConfirmCodeScreen locale="en" state="resend" />);

    expect(screen.getAllByTestId("otp-box").map((box) => box.textContent).join("")).toBe("482915");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();
    expect(screen.getByText("RESEND CODE")).toBeInTheDocument();
    expect(screen.queryByText(/Resend code in/)).toBeNull();
  });

  it("draws the boxes in the error state with the message below (AF-02-12)", () => {
    render(<ConfirmCodeScreen locale="en" state="wrongCode" />);

    expect(screen.getByText("Wrong code. Try again.")).toHaveClass("text-bad");
    expect(screen.getAllByTestId("otp-box")[0]).toHaveClass("border-bad");
  });

  it("draws the full code with the spinner while verifying (AF-02-13)", () => {
    render(<ConfirmCodeScreen locale="en" state="verifying" />);

    expect(screen.getAllByTestId("otp-box").map((box) => box.textContent).join("")).toBe("482915");
    expect(screen.getByRole("status", { name: "Confirm" })).toBeInTheDocument();
  });

  it("draws the error toast (AF-02-14)", () => {
    render(<ConfirmCodeScreen locale="en" state="errorToast" />);

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't find an account with this email. Create one to continue.");
  });
});
