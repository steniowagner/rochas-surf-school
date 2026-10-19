import { render, screen } from "@testing-library/react-native";

import { StackHeaderTitle } from "./stack-header-title.component";

describe("StackHeaderTitle", () => {
  it("shows the title in uppercase", async () => {
    await render(<StackHeaderTitle title="New class" />);

    expect(screen.getByText("NEW CLASS")).toBeTruthy();
  });
});
