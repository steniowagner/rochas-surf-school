import { render, screen } from "@testing-library/react-native";

import { PersonAvatar } from "./person-avatar.component";

describe("PersonAvatar", () => {
  it("shows the initials of the name", async () => {
    await render(<PersonAvatar name="João Pinto" />);

    expect(screen.getByText("JP")).toBeOnTheScreen();
  });

  it("renders the large size", async () => {
    await render(<PersonAvatar name="Ana" size="lg" />);

    expect(screen.getByText("A")).toBeOnTheScreen();
  });
});
