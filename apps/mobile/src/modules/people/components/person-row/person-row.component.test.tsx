import { render, screen, userEvent } from "@testing-library/react-native";

import { buildPerson } from "../../people.test-utils";

import { PersonRow } from "./person-row.component";

describe("PersonRow", () => {
  it("shows the initials, the name, since when and the role chip", async () => {
    await render(
      <PersonRow
        person={buildPerson(1, { name: "João Pinto", role: "instructor" })}
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByText("JP")).toBeOnTheScreen();
    expect(screen.getByText("João Pinto")).toBeOnTheScreen();
    expect(screen.getByText("since Jul 2026")).toBeOnTheScreen();
    expect(screen.getByText("Instructor")).toBeOnTheScreen();
  });

  it.each([
    ["student", "Student"],
    ["admin", "Admin"],
  ] as const)("labels a %s", async (role, label) => {
    await render(<PersonRow person={buildPerson(1, { role })} onPress={jest.fn()} />);

    expect(screen.getByText(label)).toBeOnTheScreen();
  });

  it("calls onPress with the person", async () => {
    const person = buildPerson(1, { name: "Ana Silva" });
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<PersonRow person={person} onPress={onPress} />);

    await user.press(screen.getByRole("button", { name: "Ana Silva" }));

    expect(onPress).toHaveBeenCalledWith(person);
  });
});
