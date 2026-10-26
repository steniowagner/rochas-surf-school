import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent } from "@testing-library/react-native";

import { PeopleEntryRow } from "./people-entry-row.component";

const fetchMock = jest.fn();

const renderRow = (onPress = jest.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PeopleEntryRow onPress={onPress} />
    </QueryClientProvider>,
  );

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ items: [], page: 1, perPage: 1, total: 30 }),
  });
  globalThis.fetch = fetchMock as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("PeopleEntryRow", () => {
  it("shows the label and the number of people on the platform", async () => {
    await renderRow();

    expect(screen.getByText("People")).toBeOnTheScreen();
    expect(await screen.findByText("30 on the platform")).toBeOnTheScreen();
  });

  it("shows no count after an error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ errors: [] }),
    });
    await renderRow();

    expect(screen.getByText("People")).toBeOnTheScreen();
    expect(screen.queryByText(/on the platform/)).not.toBeOnTheScreen();
  });

  it("calls onPress", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await renderRow(onPress);

    await user.press(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
