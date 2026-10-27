import { render, screen, userEvent } from "@testing-library/react-native";

import { buildClassItem, glyph } from "../../classes.test-utils";

import { OngoingClassCard } from "./ongoing-class-card.component";

// 10:00 – 11:30 in Fortaleza.
const item = (overrides: Parameters<typeof buildClassItem>[3] = {}) =>
  buildClassItem(
    "c-1",
    "2026-10-14T13:00:00.000Z",
    "2026-10-14T14:30:00.000Z",
    overrides,
  );

const students = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `s-${index}`,
    name: `Aluno ${index}`,
    photoUrl: null,
    enrolmentId: `e-${index}`,
  }));

describe("OngoingClassCard", () => {
  it("shows the class's chips, the in-progress chip, the time range and the location on a grape card", async () => {
    await render(
      <OngoingClassCard
        item={item({ level: "advanced" })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Surf")).toBeOnTheScreen();
    expect(screen.getByText("Advanced")).toBeOnTheScreen();
    expect(screen.getByText("In progress")).toBeOnTheScreen();
    expect(screen.getByText(glyph("time-outline"))).toBeOnTheScreen();
    expect(screen.getByText("10:00 – 11:30")).toBeOnTheScreen();
    expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
    const card = screen.getByRole("button", { name: "Surf, 10:00 – 11:30" });
    expect(card.props.className).toContain("bg-grape");
    expect(card.props.style).toEqual(
      expect.objectContaining({ boxShadow: expect.stringContaining("px") }),
    );
  });

  it("shows the skate chip for skate", async () => {
    await render(
      <OngoingClassCard
        item={item({ discipline: "skate" })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("Skate")).toBeOnTheScreen();
  });

  it("fills the occupancy bar in white, and in the bad color with the full text once full", async () => {
    await render(
      <OngoingClassCard
        item={item({ seatsTaken: 2, capacity: 8 })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByTestId("occupancy-fill").props.style).toEqual({
      width: "25%",
    });
    expect(screen.getByTestId("occupancy-fill").props.className).toContain(
      "bg-on-color",
    );
    expect(screen.getByText("2/8 spots").props.className).toContain(
      "text-on-color",
    );

    await render(
      <OngoingClassCard
        item={item({ seatsTaken: 8, capacity: 8 })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByTestId("occupancy-fill").props.className).toContain(
      "bg-bad",
    );
    expect(screen.getByText("8/8 spots").props.className).toContain(
      "text-on-grape-bad",
    );
  });

  it("shows up to four students and the hidden seats in the footer", async () => {
    await render(
      <OngoingClassCard
        item={item({ seatsTaken: 6, students: students(4) })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getAllByLabelText(/^Aluno/)).toHaveLength(4);
    expect(screen.getByText("+2")).toBeOnTheScreen();
    expect(screen.getByText("6 students confirmed")).toBeOnTheScreen();
  });

  it('shows no "+N" when every seat has an avatar', async () => {
    await render(
      <OngoingClassCard
        item={item({ seatsTaken: 2, students: students(2) })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getAllByLabelText(/^Aluno/)).toHaveLength(2);
    expect(screen.queryByText(/^\+/)).not.toBeOnTheScreen();
  });

  it("shows the hidden seats alone when only guests hold seats", async () => {
    await render(
      <OngoingClassCard item={item({ seatsTaken: 2 })} onPress={jest.fn()} />,
    );

    expect(screen.queryByLabelText(/^Aluno/)).not.toBeOnTheScreen();
    expect(screen.getByText("+2")).toBeOnTheScreen();
  });

  it("shows only the label when nobody has a seat", async () => {
    await render(<OngoingClassCard item={item()} onPress={jest.fn()} />);

    expect(screen.getByText("No students yet")).toBeOnTheScreen();
    expect(screen.queryByText(/^\+/)).not.toBeOnTheScreen();
  });

  it("opens the class when pressed", async () => {
    const onPress = jest.fn();
    await render(<OngoingClassCard item={item()} onPress={onPress} />);

    await userEvent.press(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledWith("c-1");
  });

  it("draws an erased student's generic avatar, labelled Former student", async () => {
    await render(
      <OngoingClassCard
        item={item({
          seatsTaken: 2,
          students: [
            {
              id: "s-erased",
              name: null,
              photoUrl: null,
              enrolmentId: "e-erased",
            },
            ...students(1),
          ],
        })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Former student")).toBeOnTheScreen();
    expect(screen.getByTestId("student-avatar-erased")).toBeOnTheScreen();
    expect(screen.getByLabelText("Aluno 0")).toBeOnTheScreen();
  });
});
