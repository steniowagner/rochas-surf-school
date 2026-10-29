import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NotificationRow } from "./notification-row.component";

describe("NotificationRow", () => {
  it("draws the title, the body, the time and the unread dot", () => {
    render(<NotificationRow type="enrolment.approved" title="Pedido aprovado" body="Sua vaga está confirmada." time="Agora" read={false} />);

    expect(screen.getByText("Pedido aprovado")).toBeInTheDocument();
    expect(screen.getByText("Sua vaga está confirmada.")).toBeInTheDocument();
    expect(screen.getByText("Agora")).toHaveClass("text-ink-3");
    expect(screen.getByTestId("notification-row-unread-dot")).toHaveClass("bg-sun");
  });

  it("has no dot once it is read, and no body line without a body", () => {
    render(<NotificationRow type="enrolment.approved" title="Pedido aprovado" time="há 2 h" read />);

    expect(screen.queryByTestId("notification-row-unread-dot")).toBeNull();
    expect(screen.getByText("há 2 h").parentElement?.children).toHaveLength(2);
  });

  it.each([
    ["enrolment.approved", "bg-ok-tint"],
    ["enrolment.denied", "bg-bad-tint"],
    ["class.reminder", "bg-warn-tint"],
    ["class.edited", "bg-info-tint"],
  ])("tints the %s icon with %s", (type, tile) => {
    render(<NotificationRow type={type} title="t" time="x" read />);

    expect(screen.getByTestId("notification-row-icon")).toHaveClass(tile);
  });

  it("falls back to the bell on the info tone for an unknown type", () => {
    render(<NotificationRow type="something.new" title="t" time="x" read />);

    expect(screen.getByTestId("notification-row-icon")).toHaveClass("bg-info-tint", "text-lagoon");
  });
});
