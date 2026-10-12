import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Linking } from "react-native";

import { SessionContext } from "@/providers/session/session.context";

import { ContactSchoolButton } from "./contact-school-button.component";

const fetchMock = jest.fn();
const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const answer = (whatsappNumber: string | null) =>
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ whatsappNumber }),
  });

const renderButton = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionContext.Provider
        value={{
          user: null,
          tokens: null,
          setSession: jest.fn(),
          clearSession: jest.fn(),
        }}
      >
        <ContactSchoolButton />
      </SessionContext.Provider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  fetchMock.mockReset();
  mockShow.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("ContactSchoolButton", () => {
  it("opens the wa.me chat of the school's number", async () => {
    answer("+5585999998888");
    await renderButton();

    await userEvent.press(
      await screen.findByRole("button", { name: "Contact the school" }),
    );

    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/5585999998888");
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("renders nothing while the number is loading", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await renderButton();

    expect(
      screen.queryByRole("button", { name: "Contact the school" }),
    ).not.toBeOnTheScreen();
  });

  it("renders nothing when the school has no number", async () => {
    answer(null);
    await renderButton();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: "Contact the school" }),
    ).not.toBeOnTheScreen();
  });

  it("renders nothing when the request fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    await renderButton();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      screen.queryByRole("button", { name: "Contact the school" }),
    ).not.toBeOnTheScreen();
  });

  it("shows a toast when the link can't be opened", async () => {
    answer("+5585999998888");
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no handler"));
    await renderButton();

    await userEvent.press(
      await screen.findByRole("button", { name: "Contact the school" }),
    );

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith("Couldn't open WhatsApp."),
    );
  });
});
