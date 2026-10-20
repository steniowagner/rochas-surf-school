import { render, screen, userEvent } from "@testing-library/react-native";

import type { ClassStudent } from "../../classes.types";

import { ClassPeople } from "./class-people.component";
import type { ClassPeopleProps } from "./class-people.types";

const students: ClassStudent[] = [
  { id: "s-ana", name: "Ana Souza", photoUrl: null, enrolmentId: "e-ana" },
  { id: "s-bia", name: "Bia Lima", photoUrl: null, enrolmentId: "e-bia" },
];

function props(overrides: Partial<ClassPeopleProps> = {}): ClassPeopleProps {
  return {
    instructors: [],
    students,
    seatsTaken: 2,
    capacity: 8,
    state: "not-started",
    ...overrides,
  };
}

describe("ClassPeople take out", () => {
  it("shows no Take out button without onTakeOut", async () => {
    const user = userEvent.setup();
    await render(<ClassPeople {...props()} />);

    await user.press(screen.getByRole("button", { name: /2 students/ }));

    expect(screen.getByText("Bia Lima")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /^Take out/ })).toBeNull();
  });

  it("gives each student a Take out button that calls onTakeOut with that student", async () => {
    const user = userEvent.setup();
    const onTakeOut = jest.fn();
    await render(<ClassPeople {...props({ onTakeOut })} />);
    await user.press(screen.getByRole("button", { name: /2 students/ }));

    await user.press(screen.getByRole("button", { name: "Take out Bia Lima" }));

    expect(onTakeOut).toHaveBeenCalledTimes(1);
    expect(onTakeOut).toHaveBeenCalledWith(students[1]);
  });
});
