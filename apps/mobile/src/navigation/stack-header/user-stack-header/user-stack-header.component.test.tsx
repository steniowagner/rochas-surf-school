import { screen } from "@testing-library/react-native";

import {
  renderWithProviders,
  seedSession,
} from "@/modules/profile/profile.test-utils";

import { UserStackHeader } from "./user-stack-header.component";

// The bell's count reloads when the home screen is focused; there is no navigator here.
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
}));

beforeEach(() => {
  seedSession();
  globalThis.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ count: 0 }),
  })) as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
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
