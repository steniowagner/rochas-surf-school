import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StepTabs } from "./step-tabs.component";

const steps = [
  { key: "date", label: "Data", value: "Sex, 12 set", done: true },
  { key: "time", label: "Horário", value: "09:00", done: false },
  { key: "place", label: "Local", value: "—", done: false, disabled: true },
];

describe("StepTabs", () => {
  it("shows a check on done steps and the number on pending ones", () => {
    render(<StepTabs steps={steps} selected="time" />);

    const [date, time] = screen.getAllByRole("tab");
    expect(date?.querySelector("svg")).not.toBeNull();
    expect(date?.firstElementChild).toHaveClass("bg-ok");
    expect(time).toHaveTextContent("2");
    expect(time?.firstElementChild).toHaveClass("bg-tan");
  });

  it("lifts the selected step and dims the disabled one", () => {
    render(<StepTabs steps={steps} selected="time" />);

    expect(screen.getByRole("tab", { name: "Horário, 09:00" })).toHaveClass("bg-surface");
    expect(screen.getByRole("tab", { name: "Horário, 09:00" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Local, —" })).toHaveClass("opacity-50");
  });
});
