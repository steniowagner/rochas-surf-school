import { render, screen } from "@testing-library/react-native";

import { RemovedAccountsSkeleton } from "./removed-accounts-skeleton.component";

describe("RemovedAccountsSkeleton", () => {
  it("is read out as one loading state", async () => {
    await render(<RemovedAccountsSkeleton />);

    expect(screen.getByTestId("removed-accounts-loading")).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Loading the removed accounts"),
    ).toBeOnTheScreen();
  });
});
