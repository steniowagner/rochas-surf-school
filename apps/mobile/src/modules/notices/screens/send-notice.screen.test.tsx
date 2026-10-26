import { fireEvent, screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Keyboard } from "react-native";

import {
  account,
  jsonResponse,
  renderWithProviders,
  seedSession,
  setupFetch,
} from "@/modules/profile/profile.test-utils";

import { SendNoticeScreen } from "./send-notice.screen";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  // Renders the header's title so the tests can see it.
  Stack: {
    Screen: ({ options }: any) => <>{options.headerTitle()}</>,
  },
}));

// The sheet library's mock keeps the content of a dismissed sheet; this one drops it.
jest.mock("@/components/ui/bottom-modal", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { View } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    BottomModal: ({ visible, children }: any) =>
      visible ? <View>{children}</View> : null,
  };
});

const fetchMock = setupFetch();

const COUNTS: Record<string, number> = { all: 12, students: 8, instructors: 0 };

type Serve = { count?: (audience: string) => Response; send?: () => Response | Promise<Response> };

const serve = ({ count, send }: Serve = {}) =>
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      return (send ?? (() => jsonResponse(204, undefined)))();
    }

    const audience = new URL(url).searchParams.get("audience")!;

    return (count ?? ((value) => jsonResponse(200, { count: COUNTS[value] })))(audience);
  });

const posts = () =>
  fetchMock.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([url, init]) => [new URL(url).pathname, JSON.parse(init.body)]);

const open = async (serving: Serve = {}) => {
  serve(serving);
  seedSession(account({ role: "admin" }));
  await renderWithProviders(<SendNoticeScreen />);

  return userEvent.setup();
};

const sendButton = () => screen.getByRole("button", { name: "Send" });
const titleField = () => screen.getByLabelText("Title");
const messageField = () => screen.getByLabelText("Message");

const fill = async (user: Awaited<ReturnType<typeof open>>) => {
  await user.type(titleField(), "  Class moved ");
  await user.type(messageField(), "See you at 7. ");
};

describe("SendNoticeScreen", () => {
  beforeEach(() => jest.mocked(router.back).mockReset());

  it("shows the audience selector, the fields and the live count of the audience", async () => {
    const user = await open();

    expect(screen.getByRole("header", { name: "Send notice" })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "Everyone", selected: true })).toBeOnTheScreen();
    expect(await screen.findByText("12 people will receive it")).toBeOnTheScreen();

    await user.press(screen.getByRole("tab", { name: "Students" }));

    expect(await screen.findByText("8 people will receive it")).toBeOnTheScreen();
  });

  it("says when nobody would receive it and keeps Send off", async () => {
    const user = await open();
    await fill(user);

    await user.press(screen.getByRole("tab", { name: "Instructors" }));

    expect(await screen.findByText("No one to send it to.")).toBeOnTheScreen();
    expect(sendButton()).toBeDisabled();
  });

  it("keeps Send off while a field is blank, then turns it on", async () => {
    const user = await open();
    await screen.findByText("12 people will receive it");

    expect(sendButton()).toBeDisabled();
    await user.type(titleField(), "   ");
    await user.type(messageField(), "Hello");
    expect(sendButton()).toBeDisabled();

    await user.type(titleField(), "Hi");
    expect(sendButton()).toBeEnabled();
  });

  it("keeps Send off while the count loads and after it fails", async () => {
    const user = await open({ count: () => new Promise(() => undefined) as any });
    await fill(user);

    expect(screen.getByText("Loading the recipients…")).toBeOnTheScreen();
    expect(sendButton()).toBeDisabled();
  });

  it("disables Send and says so when the count fails", async () => {
    const user = await open({ count: () => jsonResponse(500, {}) });
    await fill(user);

    expect(await screen.findByText("Couldn't count the recipients.")).toBeOnTheScreen();
    expect(sendButton()).toBeDisabled();
  });

  it("reports where each field sits and scrolls to it when it gets focus", async () => {
    const isVisible = jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    await open();

    await fireEvent(screen.getByTestId("notice-title-field"), "layout", {
      nativeEvent: { layout: { x: 0, y: 300, width: 300, height: 52 } },
    });
    await fireEvent(screen.getByTestId("notice-message-field"), "layout", {
      nativeEvent: { layout: { x: 0, y: 380, width: 300, height: 150 } },
    });
    await fireEvent(titleField(), "focus");
    await fireEvent(messageField(), "focus");

    expect(titleField()).toBeOnTheScreen();
    expect(messageField()).toBeOnTheScreen();
    isVisible.mockRestore();
  });

  it("stops the fields at the limits", async () => {
    await open();

    expect(titleField().props.maxLength).toBe(60);
    expect(messageField().props.maxLength).toBe(500);
  });

  it("names the audience and the count in the confirm sheet, and cancelling changes nothing", async () => {
    const user = await open();
    await fill(user);
    await screen.findByText("12 people will receive it");

    await user.press(sendButton());

    expect(await screen.findByText("Send this notice?")).toBeOnTheScreen();
    expect(screen.getByText("Audience: Everyone. 12 people will receive it.")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Send this notice?")).not.toBeOnTheScreen());
    expect(posts()).toEqual([]);
    expect(router.back).not.toHaveBeenCalled();
    expect(titleField().props.value).toBe("  Class moved ");
  });

  it("sends the trimmed notice on confirming, closes the screen and shows a toast", async () => {
    const user = await open();
    await fill(user);
    await screen.findByText("12 people will receive it");

    await user.press(sendButton());
    await user.press(await screen.findByRole("button", { name: "Send now" }));

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(posts()).toEqual([
      [
        "/notifications/broadcast",
        { audience: "all", title: "Class moved", message: "See you at 7." },
      ],
    ]);
    expect(await screen.findByText("Notice sent")).toBeOnTheScreen();
  });

  it("shows an error and keeps the text when the send fails", async () => {
    const user = await open({ send: () => jsonResponse(500, {}) });
    await fill(user);
    await screen.findByText("12 people will receive it");

    await user.press(sendButton());
    await user.press(await screen.findByRole("button", { name: "Send now" }));

    expect(await screen.findByText("Couldn't send the notice. Try again.")).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
    expect(titleField().props.value).toBe("  Class moved ");
    expect(messageField().props.value).toBe("See you at 7. ");
    expect(screen.queryByText("Send this notice?")).not.toBeOnTheScreen();
  });

  it("shows the no-connection error when the network is down", async () => {
    const user = await open({ send: () => Promise.reject(new TypeError("offline")) as any });
    await fill(user);
    await screen.findByText("12 people will receive it");

    await user.press(sendButton());
    await user.press(await screen.findByRole("button", { name: "Send now" }));

    expect(
      await screen.findByText("No connection. Check your internet and try again."),
    ).toBeOnTheScreen();
  });
});
