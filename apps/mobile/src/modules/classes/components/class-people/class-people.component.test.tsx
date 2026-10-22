import { render, screen, userEvent } from "@testing-library/react-native";

import type { ClassDetailsStudent } from "../../classes.types";

import { ClassPeople } from "./class-people.component";
import type { ClassPeopleInstructor, ClassPeopleProps } from "./class-people.types";

const students: ClassDetailsStudent[] = [
  { id: "s-ana", name: "Ana Souza", photoUrl: null, enrolmentId: "e-ana", whatsappNumber: null },
  { id: "s-bia", name: "Bia Lima", photoUrl: null, enrolmentId: "e-bia", whatsappNumber: "+5585911111111" },
];

function props(overrides: Partial<ClassPeopleProps> = {}): ClassPeopleProps {
  return {
    instructors: [],
    students,
    guests: [],
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

describe("ClassPeople guests", () => {
  const guests = [
    { id: "g-1", name: "Carolina Reis" },
    { id: "g-2", name: null },
  ];

  it("lists each guest with a Trial chip, after the name when it is known and alone when it is not", async () => {
    const user = userEvent.setup();
    await render(<ClassPeople {...props({ guests, seatsTaken: 4 })} />);

    await user.press(screen.getByRole("button", { name: /4 students/ }));

    expect(screen.getByText("Carolina Reis")).toBeOnTheScreen();
    expect(screen.getAllByText("Trial")).toHaveLength(2);
  });

  it("makes no guest row pressable, whatever onOpenStudent is", async () => {
    const user = userEvent.setup();
    const onOpenStudent = jest.fn();
    await render(<ClassPeople {...props({ students: [], guests, seatsTaken: 2, onOpenStudent })} />);

    await user.press(screen.getByRole("button", { name: /2 students/ }));

    expect(screen.queryByRole("button", { name: "Carolina Reis" })).toBeNull();
    await user.press(screen.getByText("Carolina Reis"));
    expect(onOpenStudent).not.toHaveBeenCalled();
  });

  it("opens a class that has only guests", async () => {
    const user = userEvent.setup();
    await render(<ClassPeople {...props({ students: [], guests, seatsTaken: 2 })} />);

    await user.press(screen.getByRole("button", { name: /2 students/ }));

    expect(screen.getByText("Carolina Reis")).toBeOnTheScreen();
  });

  it("gives each guest a Take out button only when onTakeGuestOut is set", async () => {
    const user = userEvent.setup();
    const onTakeGuestOut = jest.fn();
    const view = await render(<ClassPeople {...props({ guests, seatsTaken: 4 })} />);
    await user.press(screen.getByRole("button", { name: /4 students/ }));
    expect(screen.queryByRole("button", { name: "Take out Carolina Reis" })).toBeNull();

    await view.rerender(<ClassPeople {...props({ guests, seatsTaken: 4, onTakeGuestOut })} />);
    await user.press(screen.getByRole("button", { name: "Take out Carolina Reis" }));

    expect(onTakeGuestOut).toHaveBeenCalledWith(guests[0]);
  });

  it("ends the capacity line with how many seats are trial only when asked", async () => {
    const view = await render(<ClassPeople {...props({ guests, seatsTaken: 4 })} />);
    expect(screen.queryByText(/includes 2 trial/)).toBeNull();

    await view.rerender(<ClassPeople {...props({ guests, seatsTaken: 4, showTrialCount: true })} />);

    expect(screen.getByText("Max. 8 students · 4 spots left · includes 2 trial")).toBeOnTheScreen();
  });

  it("adds nothing to the capacity line without guests", async () => {
    await render(<ClassPeople {...props({ showTrialCount: true })} />);

    expect(screen.getByText("Max. 8 students · 6 spots left")).toBeOnTheScreen();
  });
});

describe("ClassPeople instructors", () => {
  const iara: ClassPeopleInstructor = {
    id: "i-iara",
    name: "Iara Lima",
    role: "admin",
    whatsappNumber: null,
    isViewer: false,
  };
  const rui: ClassPeopleInstructor = {
    id: "i-rui",
    name: "Rui Costa",
    role: "instructor",
    whatsappNumber: "+5585911111111",
    isViewer: true,
  };

  it("heads one instructor with \"Instructor\" and a pill named after them", async () => {
    await render(<ClassPeople {...props({ instructors: [iara] })} />);

    expect(screen.getByText("Instructor")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Iara Lima" })).toBeOnTheScreen();
  });

  it("heads several with \"Instructors\" and shows the viewer's pill as You", async () => {
    await render(<ClassPeople {...props({ instructors: [iara, rui] })} />);

    expect(screen.getByText("Instructors")).toBeOnTheScreen();
    expect(screen.getByText("Iara Lima")).toBeOnTheScreen();
    expect(screen.getByText("You")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Rui Costa" })).toBeOnTheScreen();
  });

  it("calls onOpenInstructor with the pressed instructor", async () => {
    const user = userEvent.setup();
    const onOpenInstructor = jest.fn();
    await render(<ClassPeople {...props({ instructors: [iara, rui], onOpenInstructor })} />);

    await user.press(screen.getByRole("button", { name: "Rui Costa" }));

    expect(onOpenInstructor).toHaveBeenCalledTimes(1);
    expect(onOpenInstructor).toHaveBeenCalledWith(rui);
  });

  it("does nothing on a pill without onOpenInstructor", async () => {
    const user = userEvent.setup();
    await render(<ClassPeople {...props({ instructors: [iara] })} />);

    await user.press(screen.getByRole("button", { name: "Iara Lima" }));

    expect(screen.getByText("Iara Lima")).toBeOnTheScreen();
  });

  it("says no instructor is assigned in the header, with no pill", async () => {
    await render(<ClassPeople {...props()} />);

    expect(screen.getByText("No instructor assigned")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Iara Lima" })).toBeNull();
  });
});

describe("ClassPeople students", () => {
  const seven: ClassDetailsStudent[] = Array.from({ length: 4 }, (_, index) => ({
    id: `s-${index}`,
    name: `Aluno ${index}`,
    photoUrl: null,
    enrolmentId: `e-${index}`,
    whatsappNumber: null,
  }));
  const guests = [
    { id: "g-1", name: "Carolina Reis" },
    { id: "g-2", name: null },
    { id: "g-3", name: null },
  ];

  it("stacks the first 5 seats, students then guests as a person icon, and +N for the rest", async () => {
    await render(<ClassPeople {...props({ students: seven, guests, seatsTaken: 7 })} />);

    expect(screen.getByLabelText("Aluno 0")).toBeOnTheScreen();
    expect(screen.getByLabelText("Aluno 3")).toBeOnTheScreen();
    expect(screen.getAllByLabelText("Trial")).toHaveLength(1);
    expect(screen.getByText("+2")).toBeOnTheScreen();
  });

  it("opens a student's row with onOpenStudent and that student", async () => {
    const user = userEvent.setup();
    const onOpenStudent = jest.fn();
    await render(<ClassPeople {...props({ onOpenStudent })} />);
    await user.press(screen.getByRole("button", { name: /2 students/ }));

    await user.press(screen.getByRole("button", { name: "Bia Lima" }));

    expect(onOpenStudent).toHaveBeenCalledTimes(1);
    expect(onOpenStudent).toHaveBeenCalledWith(students[1]);
  });

  it("does nothing on a student's row without onOpenStudent", async () => {
    const user = userEvent.setup();
    await render(<ClassPeople {...props()} />);
    await user.press(screen.getByRole("button", { name: /2 students/ }));

    await user.press(screen.getByRole("button", { name: "Bia Lima" }));

    expect(screen.getByText("Bia Lima")).toBeOnTheScreen();
  });

  it("takes a student out without opening their sheet", async () => {
    const user = userEvent.setup();
    const onOpenStudent = jest.fn();
    const onTakeOut = jest.fn();
    await render(<ClassPeople {...props({ onOpenStudent, onTakeOut })} />);
    await user.press(screen.getByRole("button", { name: /2 students/ }));

    await user.press(screen.getByRole("button", { name: "Take out Ana Souza" }));

    expect(onTakeOut).toHaveBeenCalledWith(students[0]);
    expect(onOpenStudent).not.toHaveBeenCalled();
  });

  it("says nobody is enrolled yet and can't expand a class with no seats taken", async () => {
    await render(<ClassPeople {...props({ students: [], seatsTaken: 0 })} />);

    const row = screen.getByRole("button", { name: "No students yet" });
    expect(row).toBeDisabled();
  });
});
