import { render, screen } from "@testing-library/react-native";

import { GuestAvatar } from "./guest-avatar.component";

describe("GuestAvatar", () => {
  it("draws a person icon labelled Trial, with or without the ring", async () => {
    const view = await render(<GuestAvatar size={32} />);

    expect(screen.getByLabelText("Trial")).toHaveStyle({ width: 32, height: 32, borderRadius: 16 });

    await view.rerender(<GuestAvatar size={30} ringed />);

    expect(screen.getByLabelText("Trial")).toHaveStyle({ width: 30, height: 30, borderRadius: 15 });
  });
});
