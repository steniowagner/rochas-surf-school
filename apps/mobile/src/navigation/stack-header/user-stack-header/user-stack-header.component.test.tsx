import { screen } from "@testing-library/react-native";

import {
  renderWithProviders,
  seedSession,
} from "@/modules/profile/profile.test-utils";

import { UserStackHeader } from "./user-stack-header.component";

beforeEach(() => {
  seedSession();
});

describe("UserStackHeader", () => {
  it("shows the user header on the page color by default", async () => {
    await renderWithProviders(<UserStackHeader />);

    expect(screen.getByText("Ana")).toBeOnTheScreen();
    expect(screen.getByTestId("user-stack-header").props.className).toEqual(
      expect.stringContaining("bg-page"),
    );
  });

  it("sits on the Agenda band when banded", async () => {
    await renderWithProviders(<UserStackHeader banded />);

    expect(screen.getByTestId("user-stack-header").props.className).toEqual(
      expect.stringContaining("bg-band"),
    );
  });
});
