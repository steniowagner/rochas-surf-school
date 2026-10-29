import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UserHeader } from "./user-header.component";

describe("UserHeader", () => {
  it("draws the avatar, the greeting over the first name and the bell with its count", () => {
    render(<UserHeader name="Ana Lima" firstName="Ana" greeting="Bom dia," notificationsLabel="Notificações" unreadCount={2} />);

    expect(screen.getByRole("img", { name: "Ana Lima" })).toHaveTextContent("AL");
    expect(screen.getByText("Bom dia,")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ana" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notificações" })).toBeInTheDocument();
    expect(screen.getByTestId("header-button-badge")).toHaveTextContent("2");
  });

  it("hides the badge with no unread notifications", () => {
    render(<UserHeader name="Ana Lima" firstName="Ana" greeting="Boa noite," notificationsLabel="N" unreadCount={0} />);

    expect(screen.queryByTestId("header-button-badge")).toBeNull();
  });
});
