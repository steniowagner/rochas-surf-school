import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";
import { Keyboard } from "react-native";

import {
  account,
  jsonResponse,
  renderWithProviders,
  seedSession,
  setupFetch,
} from "@/modules/profile/profile.test-utils";
import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider } from "@/providers/session";

import { SendNoticeScreen } from "./send-notice.screen";

let mockParams: { classId?: string } = {};

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => mockParams,
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
const messageField = () => screen.getByLabelText("Description");

const fill = async (user: Awaited<ReturnType<typeof open>>) => {
  await user.type(titleField(), "  Class moved ");
  await user.type(messageField(), "See you at 7. ");
};

/* eslint-disable @typescript-eslint/no-require-imports -- jest.mock factories can only load modules with require */
jest.mock("@/components/ui/toast", () =>
  require("@/components/ui/toast/toast.test-utils"),
);
/* eslint-enable @typescript-eslint/no-require-imports */

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

  it("reads the three counts once when it opens, so switching audiences shows the count at once", async () => {
    const user = await open();
    await fill(user);
    await screen.findByText("12 people will receive it");

    await user.press(screen.getByRole("tab", { name: "Students" }));

    expect(screen.getByText("8 people will receive it")).toBeOnTheScreen();
    expect(screen.queryByText("Loading the recipients…")).not.toBeOnTheScreen();
    expect(sendButton()).toBeEnabled();

    await user.press(screen.getByRole("tab", { name: "Everyone" }));

    expect(screen.getByText("12 people will receive it")).toBeOnTheScreen();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== "POST")).toHaveLength(3);
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

  it("names the count, the audience and the trimmed notice in the confirm sheet, and going back changes nothing", async () => {
    const user = await open();
    await fill(user);
    await screen.findByText("12 people will receive it");

    await user.press(sendButton());

    expect(await screen.findByText("Send to 12 people?")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Everyone — students, instructors and admins — gets a notification. Once it's sent, it can't be deleted.",
      ),
    ).toBeOnTheScreen();
    const preview = screen.getByTestId("notice-preview");
    expect(within(preview).getByText("Class moved")).toBeOnTheScreen();
    expect(within(preview).getByText("See you at 7.")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Back to editing" }));

    await waitFor(() => expect(screen.queryByText("Send to 12 people?")).not.toBeOnTheScreen());
    expect(posts()).toEqual([]);
    expect(router.back).not.toHaveBeenCalled();
    expect(titleField().props.value).toBe("  Class moved ");
  });

  it("names the students audience in the confirm sheet", async () => {
    const user = await open();
    await fill(user);
    await user.press(screen.getByRole("tab", { name: "Students" }));
    await screen.findByText("8 people will receive it");

    await user.press(sendButton());

    expect(
      await screen.findByText("All students get a notification. Once it's sent, it can't be deleted."),
    ).toBeOnTheScreen();
  });

  it("sends the trimmed notice on confirming, closes the screen and shows a toast", async () => {
    const user = await open();
    await fill(user);
    await screen.findByText("12 people will receive it");

    await user.press(sendButton());
    await user.press(await screen.findByRole("button", { name: "Yes, send" }));

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(posts()).toEqual([
      [
        "/notifications/broadcast",
        { audience: "all", title: "Class moved", message: "See you at 7." },
      ],
    ]);
    expect(await screen.findByText("Notice sent")).toBeOnTheScreen();
    expect(screen.getByText("tone:success")).toBeOnTheScreen();
  });

  it("shows an error and keeps the text when the send fails", async () => {
    const user = await open({ send: () => jsonResponse(500, {}) });
    await fill(user);
    await screen.findByText("12 people will receive it");

    await user.press(sendButton());
    await user.press(await screen.findByRole("button", { name: "Yes, send" }));

    expect(await screen.findByText("Couldn't send the notice. Try again.")).toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
    expect(titleField().props.value).toBe("  Class moved ");
    expect(messageField().props.value).toBe("See you at 7. ");
    expect(screen.queryByText("Send to 12 people?")).not.toBeOnTheScreen();
  });

  it("shows the no-connection error when the network is down", async () => {
    const user = await open({ send: () => Promise.reject(new TypeError("offline")) as any });
    await fill(user);
    await screen.findByText("12 people will receive it");

    await user.press(sendButton());
    await user.press(await screen.findByRole("button", { name: "Yes, send" }));

    expect(
      await screen.findByText("No connection. Check your internet and try again."),
    ).toBeOnTheScreen();
  });

  describe("in class mode", () => {
    const CLASS = {
      id: "c-1",
      discipline: "surf",
      level: "beginner",
      startsAt: "2030-01-15T11:00:00.000Z",
      endsAt: "2030-01-15T12:00:00.000Z",
      capacity: 8,
      notes: null,
      cancelledAt: null,
      cancellationMessage: null,
      cancellationDeadline: null,
      location: { id: "l-1", name: "Praia do Futuro", address: "Av. Beira Mar", latitude: null, longitude: null },
      // The admin who opens the screen (user-1) teaches it too: they are never counted.
      instructors: [
        { id: "user-1", name: "Ana Souza", role: "admin", whatsappNumber: null },
        { id: "i-1", name: "Rui Costa", role: "instructor", whatsappNumber: null },
      ],
      seatsTaken: 3,
      students: [
        { id: "s-1", name: "Bia Lima", photoUrl: null, enrolmentId: "e-1", whatsappNumber: null },
        { id: "s-2", name: null, photoUrl: null, enrolmentId: "e-2", whatsappNumber: null },
      ],
      guests: [{ id: "g-1", name: "Guest" }],
      myEnrolment: null,
      pendingRequests: 2,
    };

    type ServeClass = {
      item?: () => Response | Promise<Response>;
      send?: () => Response | Promise<Response>;
    };

    const openClass = async ({ item, send }: ServeClass = {}) => {
      mockParams = { classId: "c-1" };
      fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST") {
          return (send ?? (() => jsonResponse(204, undefined)))();
        }

        return (item ?? (() => jsonResponse(200, CLASS)))();
      });
      seedSession(account({ role: "admin" }));
      // `Infinity` schedules no garbage-collection timer for the class query or the send, which would keep Jest
      // running for minutes after the tests.
      const client = new QueryClient({
        defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity, retry: false } },
      });
      await render(
        <QueryClientProvider client={client}>
          <AlertMessageProvider>
            <SessionProvider>
              <SendNoticeScreen />
            </SessionProvider>
          </AlertMessageProvider>
        </QueryClientProvider>,
      );

      return userEvent.setup();
    };

    const gets = () =>
      fetchMock.mock.calls
        .filter(([, init]) => init?.method !== "POST")
        .map(([url]) => new URL(url).pathname + new URL(url).search);

    const confirmAndSend = async (user: Awaited<ReturnType<typeof openClass>>) => {
      await fill(user);
      await screen.findByText("5 people will receive it");
      await user.press(sendButton());
      await user.press(await screen.findByRole("button", { name: "Yes, send" }));
    };

    afterEach(() => {
      mockParams = {};
    });

    it("shows the class and its people instead of the audience selector, with the fields and Send", async () => {
      await openClass();

      expect(screen.getByRole("header", { name: "Message to the class" })).toBeOnTheScreen();
      expect(
        screen.getByText(
          "Write a title and a message. The instructors and students of this class get it as a notification.",
        ),
      ).toBeOnTheScreen();
      expect(await screen.findByText("Surf Beginner")).toBeOnTheScreen();
      expect(screen.getByText(/08:00 – 09:00$/)).toBeOnTheScreen();
      expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
      expect(within(screen.getByTestId("class-message-instructors")).getByText("Rui Costa")).toBeOnTheScreen();
      expect(
        within(screen.getByTestId("class-message-students")).getByText("Bia Lima, Former student"),
      ).toBeOnTheScreen();
      expect(screen.getByText("+ 2 pending requests")).toBeOnTheScreen();
      expect(screen.getByText("5 people will receive it")).toBeOnTheScreen();
      expect(screen.queryByRole("tab")).not.toBeOnTheScreen();
      expect(titleField()).toBeOnTheScreen();
      expect(messageField()).toBeOnTheScreen();
      expect(sendButton()).toBeOnTheScreen();
      expect(gets()).toEqual(["/classes/c-1"]);
    });

    it("says the class is loading, then says when it can't be loaded, keeping Send off", async () => {
      let answer: (response: Response) => void = () => undefined;
      const user = await openClass({ item: () => new Promise((resolve) => (answer = resolve)) });
      await fill(user);

      expect(screen.getByText("Loading the class…")).toBeOnTheScreen();
      expect(sendButton()).toBeDisabled();

      answer(jsonResponse(404, { errors: ["class.notFound"] }));

      expect(await screen.findByText("Couldn't load the class.")).toBeOnTheScreen();
      expect(sendButton()).toBeDisabled();
      expect(screen.queryByTestId("class-message-card")).not.toBeOnTheScreen();
    });

    it("keeps Send off while a field is blank, and when nobody would receive it", async () => {
      const user = await openClass();
      await screen.findByText("5 people will receive it");

      await user.type(titleField(), "Meeting point");
      expect(sendButton()).toBeDisabled();
      await user.type(messageField(), "   ");
      expect(sendButton()).toBeDisabled();
      await user.type(messageField(), "Blue tent");
      expect(sendButton()).toBeEnabled();
    });

    it("says nobody would receive it when the admin teaches the class alone", async () => {
      const user = await openClass({
        item: () =>
          jsonResponse(200, { ...CLASS, instructors: [CLASS.instructors[0]], students: [], pendingRequests: 0 }),
      });
      await fill(user);

      expect(await screen.findByText("No one to send it to.")).toBeOnTheScreen();
      expect(sendButton()).toBeDisabled();
    });

    it("stops the fields at 60 and 500 characters", async () => {
      await openClass();

      expect(titleField().props.maxLength).toBe(60);
      expect(messageField().props.maxLength).toBe(500);
    });

    it("asks to send to the class's people, and going back sends nothing and keeps the text", async () => {
      const user = await openClass();
      await fill(user);
      await screen.findByText("5 people will receive it");

      await user.press(sendButton());

      expect(await screen.findByText("Send to 5 people?")).toBeOnTheScreen();
      expect(
        screen.getByText(
          /^The instructors and students of Surf Beginner · .+, 08:00 get a notification\. Once it's sent, it can't be deleted\.$/,
        ),
      ).toBeOnTheScreen();
      expect(within(screen.getByTestId("notice-preview")).getByText("Class moved")).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Back to editing" }));

      await waitFor(() => expect(screen.queryByText("Send to 5 people?")).not.toBeOnTheScreen());
      expect(posts()).toEqual([]);
      expect(titleField().props.value).toBe("  Class moved ");
    });

    it("sends the trimmed message to the class, closes the screen and shows the success toast", async () => {
      const user = await openClass();

      await confirmAndSend(user);

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(posts()).toEqual([
        ["/classes/c-1/message", { title: "Class moved", message: "See you at 7." }],
      ]);
      expect(await screen.findByText("Message sent")).toBeOnTheScreen();
      expect(screen.getByText("tone:success")).toBeOnTheScreen();
    });

    it.each([
      ["class.finished", "This class has already finished. The message wasn't sent."],
      ["class.cancelled", "This class was cancelled. The message wasn't sent."],
    ])("shows the %s error and keeps the text", async (key, text) => {
      const user = await openClass({ send: () => jsonResponse(409, { errors: [key] }) });

      await confirmAndSend(user);

      expect(await screen.findByText(text)).toBeOnTheScreen();
      expect(router.back).not.toHaveBeenCalled();
      expect(titleField().props.value).toBe("  Class moved ");
      expect(messageField().props.value).toBe("See you at 7. ");
      expect(screen.queryByText("Send to 5 people?")).not.toBeOnTheScreen();
    });

    it("shows the no-connection error when the network is down", async () => {
      const user = await openClass({ send: () => Promise.reject(new TypeError("offline")) as any });

      await confirmAndSend(user);

      expect(
        await screen.findByText("No connection. Check your internet and try again."),
      ).toBeOnTheScreen();
      expect(posts()).toHaveLength(1);
    });
  });
});
