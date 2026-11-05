import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { openBrowserAsync } from "expo-web-browser";

import { AlertMessageProvider } from "@/providers/alert-message";

import { AboutSheet } from "./about-sheet.component";

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
jest.useFakeTimers();

const renderSheet = async (onClose = jest.fn()) => {
  await render(
    <AlertMessageProvider>
      <AboutSheet visible onClose={onClose} />
    </AlertMessageProvider>,
  );

  return userEvent.setup();
};

describe("AboutSheet", () => {
  beforeEach(() => {
    jest
      .mocked(openBrowserAsync)
      .mockReset()
      .mockResolvedValue({ type: "dismiss" } as never);
  });

  it("shows the app, version, description and creator", async () => {
    await renderSheet();

    expect(screen.getByText("Rocha's Surf School")).toBeOnTheScreen();
    expect(screen.getByText("Version 0.9 · beta")).toBeOnTheScreen();
    expect(
      screen.getByText(
        /Every week the admins posted the schedule in the school.s WhatsApp group/,
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/personal project/i)).toBeNull();
    expect(screen.getByText("Stenio Wagner")).toBeOnTheScreen();
    expect(screen.getByTestId("about-creator-photo")).toBeOnTheScreen();
    expect(screen.queryByText("SW")).toBeNull();
    expect(screen.getByText("Design and development")).toBeOnTheScreen();
  });

  it("has no privacy, terms or GitHub link", async () => {
    await renderSheet();

    expect(screen.queryByText(/GitHub|repository/i)).toBeNull();
    expect(screen.queryByText(/Privacy/i)).toBeNull();
    expect(screen.queryByText(/Terms/i)).toBeNull();
  });

  it.each([
    ["Creator's Instagram", "https://www.instagram.com/steniowagnerr/"],
    ["Creator's LinkedIn", "https://www.linkedin.com/in/steniowagner"],
  ])("opens %s in the in-app browser", async (label, url) => {
    const user = await renderSheet();

    await user.press(screen.getByRole("button", { name: label }));

    expect(openBrowserAsync).toHaveBeenCalledWith(url);
  });

  it("shows the generic toast when a link can't open", async () => {
    jest.mocked(openBrowserAsync).mockRejectedValue(new Error("no browser"));
    const user = await renderSheet();

    await user.press(
      screen.getByRole("button", { name: "Creator's Instagram" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeOnTheScreen(),
    );
  });

  it("closes with Close", async () => {
    const onClose = jest.fn();
    const user = await renderSheet(onClose);

    await user.press(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
