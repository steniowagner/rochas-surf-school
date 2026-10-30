import { render, screen, userEvent } from "@testing-library/react-native";

import { InstructorPicker } from "./instructor-picker.component";

const teachers = [
  { id: "t-1", name: "Ana Souza", photoUrl: null, role: "instructor" as const },
  { id: "t-2", name: "Bruno Lima", photoUrl: null, role: "admin" as const },
];

const props = {
  teachers,
  loading: false,
  error: false,
  selectedIds: [],
  onToggle: jest.fn(),
  onRetry: jest.fn(),
};

describe("InstructorPicker", () => {
  it("lists every teacher with initials and name, none ticked", async () => {
    await render(<InstructorPicker {...props} />);

    expect(screen.getByText("Ana Souza")).toBeTruthy();
    expect(screen.getByText("AS")).toBeTruthy();
    expect(screen.queryByText("Instructor")).toBeNull();
    expect(screen.getByText("Bruno Lima")).toBeTruthy();
    expect(screen.queryByText("Admin")).toBeNull();
    expect(
      screen.getByRole("checkbox", { name: "Ana Souza" }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Bruno Lima" }),
    ).not.toBeChecked();
  });

  it("ticks the selected rows and toggles one on a tap", async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    await render(
      <InstructorPicker {...props} selectedIds={["t-2"]} onToggle={onToggle} />,
    );

    expect(screen.getByRole("checkbox", { name: "Bruno Lima" })).toBeChecked();

    await user.press(screen.getByRole("checkbox", { name: "Ana Souza" }));

    expect(onToggle).toHaveBeenCalledWith("t-1");
  });

  it("lists more than a page of teachers", async () => {
    const many = Array.from({ length: 120 }, (_, i) => ({
      id: `t-${i}`,
      name: `Teacher ${i}`,
      photoUrl: null,
      role: "instructor" as const,
    }));
    await render(<InstructorPicker {...props} teachers={many} />);

    expect(screen.getAllByRole("checkbox")).toHaveLength(120);
  });

  it("shows a loading state while loading", async () => {
    await render(<InstructorPicker {...props} teachers={[]} loading />);

    expect(screen.getByTestId("instructors-loading")).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("shows the error with a retry button", async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(
      <InstructorPicker {...props} teachers={[]} error onRetry={onRetry} />,
    );

    expect(screen.getByText("Couldn't load the instructors.")).toBeTruthy();

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalled();
  });
});
