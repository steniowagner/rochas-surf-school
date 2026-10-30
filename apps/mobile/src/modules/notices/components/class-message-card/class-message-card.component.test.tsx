import { render, screen, userEvent } from "@testing-library/react-native";

import { ClassMessageCard } from "./class-message-card.component";

const VIEW = {
  discipline: "skate" as const,
  disciplineLabel: "Skate",
  levelLabel: "Beginner",
  dateLabel: "Wednesday, 28 Oct",
  timeRange: "14:00 – 15:30",
  locationName: "Skatepark da Vila",
  title: "3 people receive it",
  summary: "1 instructor · 1 student · 1 pending request",
  people: [
    {
      id: "i-1",
      label: "Tiago Leal",
      erased: false,
      photoUrl: null,
      role: "instructor" as const,
      roleLabel: "Instructor",
      sheetPerson: {
        name: "Tiago Leal",
        photoUrl: null,
        role: "instructor" as const,
        whatsappNumber: null,
      },
    },
    {
      id: "s-1",
      label: "Joana Rocha",
      erased: false,
      photoUrl: null,
      role: "student" as const,
      roleLabel: "Confirmed",
      sheetPerson: {
        name: "Joana Rocha",
        photoUrl: null,
        role: "student" as const,
        whatsappNumber: null,
      },
    },
  ],
};

describe("ClassMessageCard", () => {
  const onOpenPerson = jest.fn();

  beforeEach(() => onOpenPerson.mockClear());

  it("shows the class, its day, time and location, and how many people receive the message", async () => {
    await render(<ClassMessageCard view={VIEW} onOpenPerson={onOpenPerson} />);

    expect(screen.getByText("Skate")).toBeOnTheScreen();
    expect(screen.getByText("Beginner")).toBeOnTheScreen();
    expect(screen.getByText("Wednesday, 28 Oct")).toBeOnTheScreen();
    expect(screen.getByText("14:00 – 15:30")).toBeOnTheScreen();
    expect(screen.getByText("Skatepark da Vila")).toBeOnTheScreen();
    expect(screen.getByText("3 people receive it")).toBeOnTheScreen();
    expect(
      screen.getByText("1 instructor · 1 student · 1 pending request"),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Tiago Leal")).not.toBeOnTheScreen();
  });

  it("lists each person with their role once the people row is opened, and closes it again", async () => {
    const user = userEvent.setup();
    await render(<ClassMessageCard view={VIEW} onOpenPerson={onOpenPerson} />);

    await user.press(screen.getByRole("button"));

    expect(screen.getByText("Tiago Leal")).toBeOnTheScreen();
    expect(screen.getByText("Instructor")).toBeOnTheScreen();
    expect(screen.getByText("Joana Rocha")).toBeOnTheScreen();
    expect(screen.getByText("Confirmed")).toBeOnTheScreen();

    await user.press(screen.getAllByRole("button")[0]!);

    expect(screen.queryByText("Tiago Leal")).not.toBeOnTheScreen();
  });

  it("can't be opened without people", async () => {
    await render(
      <ClassMessageCard
        view={{ ...VIEW, people: [], summary: "" }}
        onOpenPerson={onOpenPerson}
      />,
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("opens the person sheet when a row is pressed, and gives an erased person none", async () => {
    const user = userEvent.setup();
    const erased = {
      ...VIEW.people[1]!,
      id: "s-2",
      label: "Former student",
      erased: true,
      sheetPerson: null,
    };
    await render(
      <ClassMessageCard
        view={{ ...VIEW, people: [...VIEW.people, erased] }}
        onOpenPerson={onOpenPerson}
      />,
    );

    await user.press(screen.getAllByRole("button")[0]!);
    await user.press(screen.getByRole("button", { name: "Joana Rocha" }));

    expect(onOpenPerson).toHaveBeenCalledWith(VIEW.people[1]!.sheetPerson);
    expect(
      screen.getByRole("button", { name: "Former student" }),
    ).toBeDisabled();
  });

  it("lists the pending requests with their own badge, after the instructors and the students", async () => {
    const user = userEvent.setup();
    const pending = {
      id: "pending-r-1",
      label: "Caio Dias",
      erased: false,
      photoUrl: null,
      role: "pending" as const,
      roleLabel: "Pending request",
      sheetPerson: {
        name: "Caio Dias",
        photoUrl: null,
        role: "student" as const,
        whatsappNumber: null,
      },
    };
    await render(
      <ClassMessageCard
        view={{ ...VIEW, people: [...VIEW.people, pending] }}
        onOpenPerson={onOpenPerson}
      />,
    );

    await user.press(screen.getAllByRole("button")[0]!);
    const names = screen
      .getAllByRole("button")
      .slice(1)
      .map((row) => row.props.accessibilityLabel);

    expect(names).toEqual(["Tiago Leal", "Joana Rocha", "Caio Dias"]);
    expect(screen.getByText("Pending request")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Caio Dias" }));

    expect(onOpenPerson).toHaveBeenCalledWith(pending.sheetPerson);
  });
});
