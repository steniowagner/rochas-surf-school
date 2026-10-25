import { render, screen, userEvent } from "@testing-library/react-native";

import { StepTabs } from "./step-tabs.component";
import { StepTab } from "./step-tabs.types";

type Key = "who" | "class";

const steps: StepTab<Key>[] = [
  { key: "who", label: "Who", value: "Ana Silva", done: true },
  { key: "class", label: "Class", value: "Not chosen", done: false },
];

describe("StepTabs", () => {
  it("shows each step's label and value", async () => {
    await render(<StepTabs steps={steps} selected="who" onChange={jest.fn()} />);

    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByText("Who")).toBeOnTheScreen();
    expect(screen.getByText("Ana Silva")).toBeOnTheScreen();
    expect(screen.getByText("Class")).toBeOnTheScreen();
    expect(screen.getByText("Not chosen")).toBeOnTheScreen();
  });

  it("shows the step number until the step is done, then a check", async () => {
    await render(<StepTabs steps={steps} selected="who" onChange={jest.fn()} />);

    expect(screen.getByText("2")).toBeOnTheScreen();
    expect(screen.queryByText("1")).not.toBeOnTheScreen();
  });

  it("marks only the selected tab as selected", async () => {
    await render(<StepTabs steps={steps} selected="class" onChange={jest.fn()} />);

    expect(screen.getByRole("tab", { name: /^Class/, selected: true })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: /^Who/, selected: false })).toBeOnTheScreen();
  });

  it("calls onChange with the key of another enabled tab", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<StepTabs steps={steps} selected="who" onChange={onChange} />);

    await user.press(screen.getByRole("tab", { name: /^Class/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("class");
  });

  it("ignores a disabled tab", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    const disabledSteps = [steps[0], { ...steps[1], disabled: true }];
    await render(<StepTabs steps={disabledSteps} selected="who" onChange={onChange} />);

    expect(screen.getByRole("tab", { name: /^Class/ })).toBeDisabled();

    await user.press(screen.getByRole("tab", { name: /^Class/ }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("ignores the selected tab", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<StepTabs steps={steps} selected="who" onChange={onChange} />);

    await user.press(screen.getByRole("tab", { name: /^Who/ }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
