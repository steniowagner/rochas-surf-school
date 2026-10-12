import { render, screen } from "@testing-library/react-native";

import { DecidedList } from "./decided-list.component";

describe("DecidedList", () => {
  it("renders nothing when empty", async () => {
    await render(<DecidedList title="Decided just now" items={[]} />);

    expect(screen.queryByText("Decided just now")).toBeNull();
  });

  it("shows the title and the items in the given order with their tags", async () => {
    await render(
      <DecidedList
        title="Decided just now"
        items={[
          { id: "b", title: "Bruno Lima", tag: "Denied", tone: "bad" },
          { id: "a", title: "Ana Souza", tag: "Approved", tone: "ok" },
        ]}
      />,
    );

    expect(screen.getByText("Decided just now")).toBeOnTheScreen();
    const names = screen
      .getAllByText(/Bruno Lima|Ana Souza/)
      .map((node) => node.props.children);
    expect(names).toEqual(["Bruno Lima", "Ana Souza"]);
    expect(screen.getByText("Denied")).toBeOnTheScreen();
    expect(screen.getByText("Approved")).toBeOnTheScreen();
  });
});
