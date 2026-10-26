import { render, screen } from "@testing-library/react-native";

import { GuestsWarning } from "./guests-warning.component";

describe("GuestsWarning", () => {
  it("says how many trial students won't hear about the change", async () => {
    await render(<GuestsWarning count={2} />);

    expect(
      screen.getByText(
        "2 trial students have no account and won't get the notice — talk to them on WhatsApp.",
      ),
    ).toBeOnTheScreen();
  });

  it("uses the singular for one guest", async () => {
    await render(<GuestsWarning count={1} />);

    expect(
      screen.getByText(
        "1 trial student has no account and won't get the notice — talk to them on WhatsApp.",
      ),
    ).toBeOnTheScreen();
  });

  it("shows nothing without guests", async () => {
    await render(<GuestsWarning count={0} />);

    expect(screen.queryByText(/trial student/)).toBeNull();
  });
});
