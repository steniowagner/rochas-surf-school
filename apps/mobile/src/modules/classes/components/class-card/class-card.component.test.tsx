import { render, screen, userEvent } from "@testing-library/react-native";

import { glyph } from "../../classes.test-utils";
import type { MyEnrolment } from "../../../enrolment/enrolment.types";
import type { ClassItem } from "../../classes.types";

import { ClassCard } from "./class-card.component";

const item = (overrides: Partial<ClassItem> = {}): ClassItem => ({
  id: "c-1",
  discipline: "surf",
  level: "beginner",
  startsAt: "2026-10-14T13:00:00.000Z", // 10:00 in Fortaleza
  endsAt: "2026-10-14T14:30:00.000Z", // 11:30
  capacity: 8,
  notes: null,
  cancelledAt: null,
  cancellationMessage: null,
  cancellationDeadline: "2026-10-13T20:00:00.000Z",
  location: {
    id: "l-1",
    name: "Praia do Futuro",
    address: "Av. Zezé Diogo, 1000",
    latitude: -3.7442,
    longitude: -38.4617,
  },
  instructors: [{ id: "i-1", name: "Ana" }],
  seatsTaken: 0,
  students: [],
  guests: [],
  myEnrolment: null,
  ...overrides,
});

const at = (iso: string) => new Date(iso);
const BEFORE = at("2026-10-14T12:00:00.000Z");
const DURING = at("2026-10-14T13:15:00.000Z");
const AFTER = at("2026-10-14T15:00:00.000Z");

describe("ClassCard", () => {
  it("shows the chips, the time range and the location, but not the instructors", async () => {
    await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);

    expect(screen.getByText("Surf")).toBeOnTheScreen();
    expect(screen.getByText("Beginner")).toBeOnTheScreen();
    expect(screen.getByText("10:00 – 11:30")).toBeOnTheScreen();
    expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
    expect(screen.queryByText("Ana")).not.toBeOnTheScreen();
  });

  it("shows the skate chip for skate", async () => {
    await render(
      <ClassCard item={item({ discipline: "skate" })} now={BEFORE} onPress={jest.fn()} />,
    );

    expect(screen.getByText("Skate")).toBeOnTheScreen();
  });

  it("draws no discipline icon, and the clock on the state chip", async () => {
    await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);
    expect(screen.queryByText(glyph("water-outline"))).not.toBeOnTheScreen();
    expect(screen.queryByText(glyph("time-outline"))).not.toBeOnTheScreen();

    await render(
      <ClassCard item={item({ discipline: "skate" })} now={DURING} onPress={jest.fn()} />,
    );
    expect(screen.queryByText(glyph("disc-outline"))).not.toBeOnTheScreen();
    expect(screen.getByText(glyph("time-outline"))).toBeOnTheScreen();
  });

  it("shows no state chip before the start", async () => {
    await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);

    expect(screen.queryByText("In progress")).not.toBeOnTheScreen();
    expect(screen.queryByText("Finished")).not.toBeOnTheScreen();
  });

  it("shows In progress while the class is under way", async () => {
    await render(<ClassCard item={item()} now={DURING} onPress={jest.fn()} />);

    expect(screen.getByText("In progress")).toBeOnTheScreen();
    expect(screen.queryByText("Finished")).not.toBeOnTheScreen();
  });

  it("shows Finished after the end", async () => {
    await render(<ClassCard item={item()} now={AFTER} onPress={jest.fn()} />);

    expect(screen.getByText("Finished")).toBeOnTheScreen();
    expect(screen.queryByText("In progress")).not.toBeOnTheScreen();
  });

  describe("cancelled", () => {
    const cancelled = (overrides: Partial<ClassItem> = {}) =>
      item({ cancelledAt: "2026-10-13T10:00:00.000Z", cancellationMessage: "Mar grande", ...overrides });

    it.each([
      ["before", BEFORE],
      ["during", DURING],
      ["after", AFTER],
    ])("shows only the Cancelled chip %s its time", async (_label, now) => {
      await render(<ClassCard item={cancelled()} now={now} onPress={jest.fn()} />);

      expect(screen.getByText("Cancelled")).toBeOnTheScreen();
      expect(screen.getByText(glyph("close-circle-outline"))).toBeOnTheScreen();
      expect(screen.queryByText("In progress")).not.toBeOnTheScreen();
      expect(screen.queryByText("Finished")).not.toBeOnTheScreen();
      expect(screen.queryByText(glyph("time-outline"))).not.toBeOnTheScreen();
    });

    it("strikes the time range through in the secondary ink, with no sun border or fading", async () => {
      await render(<ClassCard item={cancelled()} now={DURING} onPress={jest.fn()} />);

      const time = screen.getByText("10:00 – 11:30");
      expect(time.props.className).toContain("line-through");
      expect(time.props.className).toContain("text-ink-2");
      const card = screen.getByRole("button");
      expect(card.props.className).toContain("border-line");
      expect(card.props.className).not.toContain("border-sun");
      expect(card.props.className).not.toContain("opacity-[.55]");
    });

    it("keeps the look of a class that was never cancelled", async () => {
      await render(<ClassCard item={item()} now={AFTER} onPress={jest.fn()} />);

      expect(screen.queryByText("Cancelled")).not.toBeOnTheScreen();
      expect(screen.getByText("10:00 – 11:30").props.className).not.toContain("line-through");
      expect(screen.getByRole("button").props.className).toContain("opacity-[.55]");
    });
  });

  describe("look", () => {
    it("draws the card shadow and the line border on an upcoming class", async () => {
      await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);

      const card = screen.getByRole("button");
      expect(card.props.className).toContain("border-line");
      expect(card.props.className).not.toContain("opacity-");
      expect(card.props.style).toEqual(expect.objectContaining({ boxShadow: expect.stringContaining("px") }));
    });

    it("draws the sun border and a different shadow while in progress", async () => {
      await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);
      const upcomingShadow = screen.getByRole("button").props.style;

      await render(<ClassCard item={item()} now={DURING} onPress={jest.fn()} />);

      const card = screen.getByRole("button");
      expect(card.props.className).toContain("border-sun");
      expect(card.props.style).not.toEqual(upcomingShadow);
    });

    it("draws the next class with the sun border, the primary shadow and the \"Up next\" chip", async () => {
      await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);
      const upcomingShadow = screen.getByRole("button").props.style;
      expect(screen.queryByText("Up next")).not.toBeOnTheScreen();

      await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} isNext />);

      const card = screen.getByRole("button");
      expect(screen.getByText("Up next")).toBeOnTheScreen();
      expect(card.props.className).toContain("border-sun");
      expect(card.props.style).not.toEqual(upcomingShadow);
    });

    it("shows no \"Up next\" chip once the next class has started, nor on a cancelled one", async () => {
      await render(<ClassCard item={item()} now={DURING} onPress={jest.fn()} isNext />);
      expect(screen.queryByText("Up next")).not.toBeOnTheScreen();
      expect(screen.getByText("In progress")).toBeOnTheScreen();

      await render(
        <ClassCard
          item={item({ cancelledAt: "2026-10-13T10:00:00.000Z" })}
          now={BEFORE}
          onPress={jest.fn()}
          isNext
        />,
      );
      expect(screen.queryByText("Up next")).not.toBeOnTheScreen();
      expect(screen.getByRole("button").props.className).not.toContain("border-sun");
    });

    it("fades a cancelled class less than a finished one", async () => {
      await render(
        <ClassCard
          item={item({ cancelledAt: "2026-10-13T10:00:00.000Z" })}
          now={BEFORE}
          onPress={jest.fn()}
        />,
      );

      expect(screen.getByRole("button").props.className).toContain("opacity-[.78]");
    });

    it("puts the location in a pill with the card-meta type and a line border", async () => {
      await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);

      expect(screen.getByText("Praia do Futuro").props.className).toContain("ds-text-card-meta");
    });
  });

  describe("enrolment", () => {
    const mine = (status: MyEnrolment["status"], overrides: Partial<ClassItem> = {}) =>
      item({ myEnrolment: { id: "e-1", status, requestedAt: "2026-10-13T10:00:00.000Z", reason: null }, ...overrides });
    const FULL = { seatsTaken: 8 };

    it.each([
      ["pending", {}, "Pending"],
      ["pending", FULL, "On the waiting list"],
      ["withdrawn", {}, "Withdrawn"],
      ["expired", {}, "Expired"],
      ["approved", {}, "Approved"],
      ["approved", FULL, "Approved"],
      ["denied", {}, "Denied"],
    ] as const)("shows the %s chip (%j) in place of the full chip", async (status, extra, label) => {
      await render(<ClassCard item={mine(status, extra)} now={BEFORE} onPress={jest.fn()} showEnrolment />);

      expect(screen.getByText(label)).toBeOnTheScreen();
      expect(screen.queryByText("Full")).not.toBeOnTheScreen();
    });

    it("keeps the full chip for a student without an enrolment", async () => {
      await render(<ClassCard item={item(FULL)} now={BEFORE} onPress={jest.fn()} showEnrolment />);

      expect(screen.getByText("Full")).toBeOnTheScreen();
    });

    it("shows nothing about the enrolment without showEnrolment (instructors and admins)", async () => {
      await render(<ClassCard item={mine("pending")} now={BEFORE} onPress={jest.fn()} />);

      expect(screen.queryByText("Pending")).not.toBeOnTheScreen();
    });

    it("draws the chip of a student who was taken out", async () => {
      await render(<ClassCard item={mine("takenOut")} now={BEFORE} onPress={jest.fn()} showEnrolment />);

      expect(screen.getByText("Taken out")).toBeOnTheScreen();
      expect(screen.queryByText("Pending")).not.toBeOnTheScreen();
      expect(screen.queryByText("Approved")).not.toBeOnTheScreen();
    });

    it("lets the started, finished and cancelled chips win", async () => {
      await render(<ClassCard item={mine("pending")} now={DURING} onPress={jest.fn()} showEnrolment />);
      expect(screen.queryByText("Pending")).not.toBeOnTheScreen();
      expect(screen.getByText("In progress")).toBeOnTheScreen();

      await render(<ClassCard item={mine("pending")} now={AFTER} onPress={jest.fn()} showEnrolment />);
      expect(screen.queryByText("Pending")).not.toBeOnTheScreen();

      await render(
        <ClassCard
          item={mine("pending", { cancelledAt: "2026-10-13T10:00:00.000Z" })}
          now={BEFORE}
          onPress={jest.fn()}
          showEnrolment
        />,
      );
      expect(screen.queryByText("Pending")).not.toBeOnTheScreen();
      expect(screen.getByText("Cancelled")).toBeOnTheScreen();
    });
  });

  describe("no instructor", () => {
    const alone = (overrides: Partial<ClassItem> = {}) => item({ instructors: [], ...overrides });

    it("shows nothing about it to students and instructors", async () => {
      await render(<ClassCard item={alone()} now={BEFORE} onPress={jest.fn()} />);

      expect(screen.queryByText("No instructor")).not.toBeOnTheScreen();
      expect(screen.queryByText(glyph("person-remove-outline"))).not.toBeOnTheScreen();
    });

    it("adds the warn chip for admins (showFlags) on a class that hasn't started", async () => {
      await render(<ClassCard item={alone()} now={BEFORE} onPress={jest.fn()} showFlags />);

      expect(screen.getAllByText("No instructor")).toHaveLength(1);
      expect(screen.getByText(glyph("person-remove-outline"))).toBeOnTheScreen();
    });

    it("drops the chip once the class has started or is cancelled", async () => {
      await render(<ClassCard item={alone()} now={DURING} onPress={jest.fn()} showFlags />);
      expect(screen.getByText("In progress")).toBeOnTheScreen();
      expect(screen.queryByText("No instructor")).not.toBeOnTheScreen();

      await render(
        <ClassCard
          item={alone({ cancelledAt: "2026-10-13T10:00:00.000Z" })}
          now={BEFORE}
          onPress={jest.fn()}
          showFlags
        />,
      );
      expect(screen.getByText("Cancelled")).toBeOnTheScreen();
      expect(screen.queryByText("No instructor")).not.toBeOnTheScreen();
      expect(screen.queryByText(glyph("person-remove-outline"))).not.toBeOnTheScreen();
    });

    it("shows no chip for a class with an instructor", async () => {
      await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} showFlags />);

      expect(screen.queryByText("No instructor")).not.toBeOnTheScreen();
      expect(screen.queryByText(glyph("person-remove-outline"))).not.toBeOnTheScreen();
    });
  });

  describe("no deadline", () => {
    const unset = (overrides: Partial<ClassItem> = {}) =>
      item({ cancellationDeadline: null, ...overrides });

    it("shows the warn chip to admins (showFlags) on a class that hasn't started", async () => {
      await render(<ClassCard item={unset()} now={BEFORE} onPress={jest.fn()} showFlags />);

      expect(screen.getByText("No deadline")).toBeOnTheScreen();
      expect(screen.getByText(glyph("calendar-clear-outline"))).toBeOnTheScreen();
    });

    it("shows nobody else the chip", async () => {
      await render(<ClassCard item={unset()} now={BEFORE} onPress={jest.fn()} />);

      expect(screen.queryByText("No deadline")).not.toBeOnTheScreen();
    });

    it("shows no chip once the class has a deadline, has started or is cancelled", async () => {
      await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} showFlags />);
      expect(screen.queryByText("No deadline")).not.toBeOnTheScreen();

      await render(<ClassCard item={unset()} now={DURING} onPress={jest.fn()} showFlags />);
      expect(screen.queryByText("No deadline")).not.toBeOnTheScreen();

      await render(
        <ClassCard
          item={unset({ cancelledAt: "2026-10-13T10:00:00.000Z" })}
          now={BEFORE}
          onPress={jest.fn()}
          showFlags
        />,
      );
      expect(screen.queryByText("No deadline")).not.toBeOnTheScreen();
    });

    it("stacks it under No instructor when both apply", async () => {
      await render(
        <ClassCard item={unset({ instructors: [] })} now={BEFORE} onPress={jest.fn()} showFlags />,
      );

      const chips = screen
        .getAllByText(/^(No instructor|No deadline)$/)
        .map((node) => node.props.children);
      expect(chips).toEqual(["No instructor", "No deadline"]);
    });
  });

  describe("occupancy", () => {
    const fillOf = () => screen.getByTestId("occupancy-fill");

    it("shows an empty track and 0/M spots for a class without seats taken", async () => {
      await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);

      expect(screen.getByText("0/8 spots")).toBeOnTheScreen();
      expect(fillOf().props.style).toEqual(expect.objectContaining({ width: "0%" }));
    });

    it("fills round(N/M) percent of the track, in the lagoon colour for surf and tan for skate", async () => {
      await render(<ClassCard item={item({ seatsTaken: 3 })} now={BEFORE} onPress={jest.fn()} />);
      expect(fillOf().props.style).toEqual(expect.objectContaining({ width: "38%" }));
      expect(fillOf().props.className).toContain("bg-lagoon");
      expect(screen.getByText("3/8 spots").props.className).toContain("text-ink-2");

      await render(
        <ClassCard item={item({ discipline: "skate", seatsTaken: 3 })} now={BEFORE} onPress={jest.fn()} />,
      );
      expect(fillOf().props.className).toContain("bg-tan");
    });

    it("turns the fill sun above 80 percent", async () => {
      await render(<ClassCard item={item({ seatsTaken: 7 })} now={BEFORE} onPress={jest.fn()} />);

      expect(fillOf().props.className).toContain("bg-sun");
      expect(screen.queryByText("Full")).not.toBeOnTheScreen();
    });

    it("turns the fill and the text bad, and adds the Full chip, for a full class", async () => {
      await render(<ClassCard item={item({ seatsTaken: 8 })} now={BEFORE} onPress={jest.fn()} />);

      expect(fillOf().props.className).toContain("bg-bad");
      expect(fillOf().props.style).toEqual(expect.objectContaining({ width: "100%" }));
      expect(screen.getByText("8/8 spots").props.className).toContain("text-bad");
      expect(screen.getByText("Full")).toBeOnTheScreen();
    });

    it("keeps the bar but lets the In progress chip win over Full", async () => {
      await render(<ClassCard item={item({ seatsTaken: 8 })} now={DURING} onPress={jest.fn()} />);

      expect(screen.getByText("In progress")).toBeOnTheScreen();
      expect(screen.queryByText("Full")).not.toBeOnTheScreen();
      expect(screen.getByText("8/8 spots")).toBeOnTheScreen();
    });
  });

  describe("students footer", () => {
    const students = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `s-${index}`,
        name: `Aluno ${index}`,
        photoUrl: null,
        enrolmentId: `e-${index}`,
      }));

    it("reads No students yet, without avatars, for a class without seats taken", async () => {
      await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);

      expect(screen.getByText("No students yet")).toBeOnTheScreen();
      expect(screen.queryByLabelText(/^Aluno/)).not.toBeOnTheScreen();
    });

    it("reads 1 student confirmed with one avatar", async () => {
      await render(
        <ClassCard item={item({ seatsTaken: 1, students: students(1) })} now={BEFORE} onPress={jest.fn()} />,
      );

      expect(screen.getByText("1 student confirmed")).toBeOnTheScreen();
      expect(screen.getByLabelText("Aluno 0")).toBeOnTheScreen();
      expect(screen.queryByText("+0")).not.toBeOnTheScreen();
    });

    it("shows 4 avatars and +N for the other seats taken", async () => {
      await render(
        <ClassCard item={item({ seatsTaken: 7, students: students(4) })} now={BEFORE} onPress={jest.fn()} />,
      );

      expect(screen.getByText("7 students confirmed")).toBeOnTheScreen();
      expect(screen.getAllByLabelText(/^Aluno/)).toHaveLength(4);
      expect(screen.getByText("+3")).toBeOnTheScreen();
    });

    it("never draws more than 4 avatars", async () => {
      await render(
        <ClassCard item={item({ seatsTaken: 6, students: students(6) })} now={BEFORE} onPress={jest.fn()} />,
      );

      expect(screen.getAllByLabelText(/^Aluno/)).toHaveLength(4);
      expect(screen.getByText("+2")).toBeOnTheScreen();
    });
  });

  describe("finished", () => {
    it("hides the bar and reads N students present", async () => {
      await render(<ClassCard item={item({ seatsTaken: 5 })} now={AFTER} onPress={jest.fn()} />);

      expect(screen.queryByTestId("occupancy-fill")).not.toBeOnTheScreen();
      expect(screen.queryByText("5/8 spots")).not.toBeOnTheScreen();
      expect(screen.getByText("5 students present")).toBeOnTheScreen();
    });

    it("reads 1 student present, and No students yet for none", async () => {
      await render(<ClassCard item={item({ seatsTaken: 1 })} now={AFTER} onPress={jest.fn()} />);
      expect(screen.getByText("1 student present")).toBeOnTheScreen();

      await render(<ClassCard item={item()} now={AFTER} onPress={jest.fn()} />);
      expect(screen.getByText("No students yet")).toBeOnTheScreen();
    });
  });

  describe("cancelled", () => {
    const gone = (overrides: Partial<ClassItem> = {}) =>
      item({ cancelledAt: "2026-10-13T10:00:00.000Z", seatsTaken: 5, ...overrides });

    it("shows neither the bar nor the footer", async () => {
      await render(<ClassCard item={gone()} now={BEFORE} onPress={jest.fn()} />);

      expect(screen.queryByTestId("occupancy-fill")).not.toBeOnTheScreen();
      expect(screen.queryByText("5 students confirmed")).not.toBeOnTheScreen();
      expect(screen.queryByText("No students yet")).not.toBeOnTheScreen();
    });

    it("counts a class past its end and cancelled as cancelled", async () => {
      await render(<ClassCard item={gone()} now={AFTER} onPress={jest.fn()} />);

      expect(screen.queryByText("5 students present")).not.toBeOnTheScreen();
      expect(screen.getByText("Cancelled")).toBeOnTheScreen();
    });
  });

  it("opens the class when pressed", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<ClassCard item={item()} now={BEFORE} onPress={onPress} />);

    await user.press(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledWith("c-1");
  });
});
