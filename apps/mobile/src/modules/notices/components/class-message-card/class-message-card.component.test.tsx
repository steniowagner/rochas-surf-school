import { render, screen, within } from "@testing-library/react-native";

import { ClassMessageCard } from "./class-message-card.component";

const VIEW = {
  name: "Surf Beginner",
  when: "Tomorrow · 08:00 – 09:00",
  locationName: "Praia do Futuro",
  groups: [
    { key: "instructors" as const, label: "Instructors", names: ["Rui"] },
    { key: "students" as const, label: "Students", names: ["Ana Souza", "Bia Lima"] },
  ],
  pendingLine: "+ 2 pending requests",
};

describe("ClassMessageCard", () => {
  it("shows the class, its day, time and location, and the people who receive the message", async () => {
    await render(<ClassMessageCard view={VIEW} />);

    expect(screen.getByText("Surf Beginner")).toBeOnTheScreen();
    expect(screen.getByText("Tomorrow · 08:00 – 09:00")).toBeOnTheScreen();
    expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
    expect(within(screen.getByTestId("class-message-instructors")).getByText("Rui")).toBeOnTheScreen();
    expect(
      within(screen.getByTestId("class-message-students")).getByText("Ana Souza, Bia Lima"),
    ).toBeOnTheScreen();
    expect(screen.getByText("+ 2 pending requests")).toBeOnTheScreen();
  });

  it("lists only the groups with somebody, and no pending line without requests", async () => {
    await render(
      <ClassMessageCard view={{ ...VIEW, groups: [VIEW.groups[1]!], pendingLine: null }} />,
    );

    expect(screen.queryByTestId("class-message-instructors")).not.toBeOnTheScreen();
    expect(screen.getByTestId("class-message-students")).toBeOnTheScreen();
    expect(screen.queryByText(/pending/)).not.toBeOnTheScreen();
  });

  it("shows only the class when nobody would receive the message", async () => {
    await render(<ClassMessageCard view={{ ...VIEW, groups: [], pendingLine: null }} />);

    expect(screen.getByText("Surf Beginner")).toBeOnTheScreen();
    expect(screen.queryByText("Students")).not.toBeOnTheScreen();
  });
});
