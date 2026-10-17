import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import { SessionProvider } from "@/providers/session";
import * as api from "@/services/api";

import type { ClassItem } from "../classes.types";
import {
  failure,
  fetchMock,
  glyph,
  ok,
  setupSignedInUser,
} from "../classes.test-utils";

import { ClassDetailsScreen } from "./class-details.screen";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

// The global sheet mock always renders its content; this one renders it only while visible.
jest.mock("@/components/ui/bottom-modal", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { View } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    BottomModal: ({ visible, children }: any) =>
      visible ? <View>{children}</View> : null,
  };
});

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: "c-1" }),
}));

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return {
    ...actual,
    apiGet: jest.fn(actual.apiGet),
    apiPost: jest.fn(actual.apiPost),
  };
});

// Wednesday 2026-10-14, 10:00 in Fortaleza.
const NOW = new Date("2026-10-14T13:00:00.000Z");

const makeClass = (overrides: Partial<ClassItem> = {}): ClassItem => ({
  id: "c-1",
  discipline: "surf",
  level: "beginner",
  startsAt: "2026-10-14T19:00:00.000Z", // 16:00
  endsAt: "2026-10-14T20:30:00.000Z", // 17:30
  capacity: 8,
  notes: "Ponto de encontro na barraca 3.",
  cancelledAt: null,
  cancellationMessage: null,
  location: {
    id: "l-1",
    name: "Praia do Futuro",
    address: "Av. Zezé Diogo, 1000",
  },
  instructors: [
    { id: "u-1", name: "Ana Souza" },
    { id: "i-2", name: "Bruno Lima" },
  ],
  ...overrides,
});

const refused = (status: number, key: string) => ({
  ok: false,
  status,
  json: async () => ({ errors: [key] }),
});

const serve = (item: ClassItem) => fetchMock.mockResolvedValue(ok(item));

const renderScreen = async (canEdit?: boolean) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  await render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ClassDetailsScreen canEdit={canEdit} />
      </SessionProvider>
    </QueryClientProvider>,
  );
};

const FAKE_ONLY_DATE = [
  "nextTick",
  "setImmediate",
  "clearImmediate",
  "setInterval",
  "clearInterval",
  "setTimeout",
  "clearTimeout",
  "queueMicrotask",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "requestIdleCallback",
  "cancelIdleCallback",
  "performance",
  "hrtime",
] as const;

beforeEach(() => {
  setupSignedInUser();
  jest.useFakeTimers({ now: NOW, doNotFake: [...FAKE_ONLY_DATE] });
});

afterEach(() => jest.useRealTimers());

describe("ClassDetailsScreen", () => {
  it("shows the class", async () => {
    serve(makeClass());
    await renderScreen();

    expect(await screen.findByText("16:00 – 17:30")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Details" })).toBeOnTheScreen();
    expect(screen.getByText("Surf")).toBeOnTheScreen();
    expect(screen.getByText("Beginner")).toBeOnTheScreen();
    expect(screen.getByText("Today · 14 Oct")).toBeOnTheScreen();
    expect(screen.getByText("Instructors")).toBeOnTheScreen();
    expect(screen.getByText("AS")).toBeOnTheScreen();
    expect(screen.getByText("BL")).toBeOnTheScreen();
    expect(screen.getByText("Bruno Lima")).toBeOnTheScreen();
    expect(screen.getByText("Max. 8 students")).toBeOnTheScreen();
    expect(screen.getByText("Notes")).toBeOnTheScreen();
    expect(
      screen.getByText("Ponto de encontro na barraca 3."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Location")).toBeOnTheScreen();
    expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
    expect(screen.getByText("Av. Zezé Diogo, 1000")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
    expect(screen.queryByText("In progress")).not.toBeOnTheScreen();
    expect(screen.queryByText("Class finished")).not.toBeOnTheScreen();
  });

  it("draws the surf icon on the discipline chip", async () => {
    serve(makeClass());
    await renderScreen();

    await screen.findByText("Surf");
    expect(screen.getByText(glyph("water-outline"))).toBeOnTheScreen();
  });

  it("shows the skate chip for skate", async () => {
    serve(makeClass({ discipline: "skate" }));
    await renderScreen();

    expect(await screen.findByText("Skate")).toBeOnTheScreen();
    expect(screen.getByText(glyph("disc-outline"))).toBeOnTheScreen();
  });

  it("hides the notes when there are none", async () => {
    serve(makeClass({ notes: null }));
    await renderScreen();

    await screen.findByText("16:00 – 17:30");
    expect(screen.queryByText("Notes")).not.toBeOnTheScreen();
  });

  it("names the viewer You, and one instructor singular", async () => {
    serve(
      makeClass({
        instructors: [{ id: "u-1", name: "Ana Souza" }],
        capacity: 1,
      }),
    );
    await renderScreen();

    expect(await screen.findByText("You")).toBeOnTheScreen();
    expect(screen.queryByText("Ana Souza")).not.toBeOnTheScreen();
    expect(screen.getByText("Instructor")).toBeOnTheScreen();
    expect(screen.getByText("Max. 1 student")).toBeOnTheScreen();
  });

  it("writes the date relative to today", async () => {
    serve(
      makeClass({
        startsAt: "2026-10-15T19:00:00.000Z",
        endsAt: "2026-10-15T20:00:00.000Z",
      }),
    );
    await renderScreen();
    expect(await screen.findByText("Tomorrow · 15 Oct")).toBeOnTheScreen();
  });

  it.each([
    ["2026-10-13T19:00:00.000Z", "Yesterday · 13 Oct"],
    ["2026-10-16T19:00:00.000Z", "Friday · 16 Oct"],
    ["2027-01-05T19:00:00.000Z", "Tuesday · 5 Jan 2027"],
  ])("writes %s as %s", async (startsAt, line) => {
    serve(makeClass({ startsAt, endsAt: startsAt }));
    await renderScreen();

    expect(await screen.findByText(line)).toBeOnTheScreen();
  });

  it("shows the started and finished banners", async () => {
    serve(
      makeClass({
        startsAt: "2026-10-14T12:00:00.000Z",
        endsAt: "2026-10-14T14:00:00.000Z",
      }),
    );
    await renderScreen();

    expect(await screen.findByText("In progress")).toBeOnTheScreen();
    expect(
      screen.getByText("Started at 09:00 and ends at 11:00."),
    ).toBeOnTheScreen();
  });

  it("shows the finished banner", async () => {
    serve(
      makeClass({
        startsAt: "2026-10-14T10:00:00.000Z",
        endsAt: "2026-10-14T11:30:00.000Z",
      }),
    );
    await renderScreen();

    expect(await screen.findByText("Class finished")).toBeOnTheScreen();
    expect(screen.getByText("Ended at 08:30.")).toBeOnTheScreen();
  });

  it("shows the started banner once the clock passes the start", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-14T18:59:00.000Z") });
    serve(makeClass());
    await renderScreen();
    await screen.findByText("16:00 – 17:30");
    expect(screen.queryByText("In progress")).not.toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getByText("In progress")).toBeOnTheScreen();
  });

  describe("cancelled", () => {
    const CANCELLED = { cancelledAt: "2026-10-13T10:00:00.000Z" };

    it("shows the banner and the team's message instead of the started banner", async () => {
      serve(
        makeClass({
          ...CANCELLED,
          cancellationMessage: "Mar muito grande.",
          startsAt: "2026-10-14T12:00:00.000Z",
          endsAt: "2026-10-14T14:00:00.000Z",
        }),
      );
      await renderScreen();

      expect(await screen.findByText("Class cancelled")).toBeOnTheScreen();
      expect(
        screen.getByText("This class won't take place."),
      ).toBeOnTheScreen();
      expect(screen.getByText(glyph("close-circle-outline"))).toBeOnTheScreen();
      expect(screen.getByText("Message from the team")).toBeOnTheScreen();
      expect(screen.getByText("Mar muito grande.")).toBeOnTheScreen();
      expect(screen.queryByText("In progress")).not.toBeOnTheScreen();
    });

    it("shows the banner instead of the finished banner, whatever the clock", async () => {
      serve(
        makeClass({
          ...CANCELLED,
          startsAt: "2026-10-14T08:00:00.000Z",
          endsAt: "2026-10-14T09:00:00.000Z",
        }),
      );
      await renderScreen();

      expect(await screen.findByText("Class cancelled")).toBeOnTheScreen();
      expect(screen.queryByText("Class finished")).not.toBeOnTheScreen();
    });

    it("shows no message card without a message", async () => {
      serve(makeClass({ ...CANCELLED, cancellationMessage: null }));
      await renderScreen();

      expect(await screen.findByText("Class cancelled")).toBeOnTheScreen();
      expect(screen.queryByText("Message from the team")).not.toBeOnTheScreen();
    });

    it("shows neither for a class that isn't cancelled", async () => {
      serve(makeClass());
      await renderScreen();

      expect(await screen.findByText("16:00 – 17:30")).toBeOnTheScreen();
      expect(screen.queryByText("Class cancelled")).not.toBeOnTheScreen();
      expect(screen.queryByText("Message from the team")).not.toBeOnTheScreen();
    });

    it("hides the pencil from an admin", async () => {
      serve(makeClass(CANCELLED));
      await renderScreen(true);

      expect(await screen.findByText("Class cancelled")).toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: "Edit class" }),
      ).not.toBeOnTheScreen();
    });
  });

  it("shows the loading state", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    await renderScreen();

    expect(screen.getByTestId("class-details-loading")).toBeOnTheScreen();
  });

  it("shows the error and retries", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ errors: [] }),
    });
    await renderScreen();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(20_000);
    });

    expect(screen.getByText("Couldn't load the class.")).toBeOnTheScreen();

    serve(makeClass());
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("16:00 – 17:30")).toBeOnTheScreen();
  });

  it("shows nothing when the session expired", async () => {
    (api.apiGet as jest.Mock).mockRejectedValueOnce(
      new api.SessionExpiredError(),
    );
    await renderScreen();

    await waitFor(() => expect(api.apiGet).toHaveBeenCalled());
    await act(async () => undefined);

    expect(
      screen.queryByText("Couldn't load the class."),
    ).not.toBeOnTheScreen();
    expect(screen.queryByTestId("class-details-loading")).not.toBeOnTheScreen();
    expect(
      screen.queryByText("This class no longer exists."),
    ).not.toBeOnTheScreen();
  });

  it("says a missing class no longer exists", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ errors: ["class.notFound"] }),
    });
    await renderScreen();

    expect(
      await screen.findByText("This class no longer exists."),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeOnTheScreen();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("tools: does not show after a failed load", async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ errors: [] }),
    });
    await renderScreen(true);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(20_000);
    });

    expect(screen.getByText("Couldn't load the class.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Class tools" })).toBeNull();
  });

  describe("tools", () => {
    const toolsButton = () =>
      screen.queryByRole("button", { name: "Class tools" });

    beforeEach(() => {
      (router.push as jest.Mock).mockClear();
      (router.back as jest.Mock).mockClear();
      mockShow.mockClear();
    });

    it("replaces the pencil: an admin sees the tools button and no pencil", async () => {
      serve(makeClass());
      await renderScreen(true);

      expect(
        await screen.findByRole("button", { name: "Class tools" }),
      ).toBeOnTheScreen();
      expect(screen.getByText(glyph("construct-outline"))).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Edit class" })).toBeNull();
      expect(screen.queryByText(glyph("pencil"))).toBeNull();
    });

    it("opens the sheet with the three tools, and Edit class opens the editor", async () => {
      const user = userEvent.setup();
      serve(makeClass());
      await renderScreen(true);

      await user.press(
        await screen.findByRole("button", { name: "Class tools" }),
      );

      expect(
        screen.getByRole("button", { name: "Notify students and instructors" }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Cancel class" }),
      ).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Edit class" }));

      expect(router.push).toHaveBeenCalledWith(routes.admin.editClass("c-1"));
      expect(screen.queryByRole("button", { name: "Cancel class" })).toBeNull();
    });

    it("does nothing when Notify students and instructors is pressed", async () => {
      const user = userEvent.setup();
      serve(makeClass());
      await renderScreen(true);
      await user.press(
        await screen.findByRole("button", { name: "Class tools" }),
      );

      await user.press(
        screen.getByRole("button", { name: "Notify students and instructors" }),
      );

      expect(router.push).not.toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: "Cancel class" }),
      ).toBeOnTheScreen();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("shows on a class that has started", async () => {
      serve(
        makeClass({
          startsAt: "2026-10-14T12:00:00.000Z",
          endsAt: "2026-10-14T14:00:00.000Z",
        }),
      );
      await renderScreen(true);

      expect(await screen.findByText("In progress")).toBeOnTheScreen();
      expect(toolsButton()).toBeOnTheScreen();
    });

    it("does not show on a class that has finished", async () => {
      serve(
        makeClass({
          startsAt: "2026-10-14T11:00:00.000Z",
          endsAt: "2026-10-14T12:00:00.000Z",
        }),
      );
      await renderScreen(true);

      expect(await screen.findByText("Class finished")).toBeOnTheScreen();
      expect(toolsButton()).toBeNull();
    });

    it("does not show for anyone but an admin", async () => {
      serve(makeClass());
      await renderScreen();

      expect(await screen.findByText("16:00 – 17:30")).toBeOnTheScreen();
      expect(toolsButton()).toBeNull();
    });

    it("does not show while loading", async () => {
      let finish: (value: unknown) => void = () => undefined;
      fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      await renderScreen(true);

      expect(screen.getByTestId("class-details-loading")).toBeOnTheScreen();
      expect(toolsButton()).toBeNull();

      await act(async () => finish(ok(makeClass())));
    });

    it("does not show for a missing class", async () => {
      fetchMock.mockResolvedValue(failure(404));
      await renderScreen(true);

      expect(
        await screen.findByText("This class no longer exists."),
      ).toBeOnTheScreen();
      expect(toolsButton()).toBeNull();
    });
  });

  describe("cancel", () => {
    const posts = () =>
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST") as [
        string,
        { body: string },
      ][];
    const confirmButton = () =>
      screen.getByRole("button", { name: "Cancel and notify" });

    // The class is served for every GET; the cancellation answers as the test says.
    const serveCancel = (
      answer: () => unknown = () =>
        ok(makeClass({ cancelledAt: NOW.toISOString() })),
    ) =>
      fetchMock.mockImplementation(
        async (_url: string, init?: { method?: string }) =>
          init?.method === "POST" ? answer() : ok(makeClass()),
      );

    async function openSheet() {
      const user = userEvent.setup();
      await renderScreen(true);
      await user.press(
        await screen.findByRole("button", { name: "Class tools" }),
      );
      await user.press(screen.getByRole("button", { name: "Cancel class" }));

      return user;
    }

    beforeEach(() => {
      (router.back as jest.Mock).mockClear();
      mockShow.mockClear();
      serveCancel();
    });

    it("closes the tools and opens the confirmation sheet", async () => {
      await openSheet();

      expect(screen.getByText("Cancel this class?")).toBeOnTheScreen();
      expect(screen.getByText("Message (optional)")).toBeOnTheScreen();
      expect(
        screen.queryByRole("button", {
          name: "Notify students and instructors",
        }),
      ).toBeNull();
      expect(posts()).toHaveLength(0);
    });

    it("cancels with the trimmed message once, shows the toast and stays on the details", async () => {
      const user = await openSheet();

      await user.type(
        screen.getByLabelText("Message (optional)"),
        "  Big waves.  ",
      );
      await user.press(confirmButton());

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("Class cancelled"),
      );
      expect(posts()).toHaveLength(1);
      expect(posts()[0]![0]).toBe("http://api.test/classes/c-1/cancel");
      expect(JSON.parse(posts()[0]![1].body)).toEqual({
        message: "Big waves.",
      });
      expect(screen.queryByText("Cancel this class?")).toBeNull();
      expect(router.back).not.toHaveBeenCalled();
    });

    it("omits a blank message from the request", async () => {
      const user = await openSheet();

      await user.type(screen.getByLabelText("Message (optional)"), "   ");
      await user.press(confirmButton());

      await waitFor(() => expect(posts()).toHaveLength(1));
      expect(JSON.parse(posts()[0]![1].body)).toEqual({});
    });

    it("keeps the class: Keep class closes the sheet without a request", async () => {
      const user = await openSheet();

      await user.press(screen.getByRole("button", { name: "Keep class" }));

      expect(screen.queryByText("Cancel this class?")).toBeNull();
      expect(posts()).toHaveLength(0);
    });

    it("sends once on a double press", async () => {
      let finish: (value: unknown) => void = () => undefined;
      fetchMock.mockImplementation(
        async (_url: string, init?: { method?: string }) =>
          init?.method === "POST"
            ? new Promise((resolve) => (finish = resolve))
            : ok(makeClass()),
      );
      await openSheet();
      const button = confirmButton();

      await act(async () => {
        void fireEvent.press(button);
        void fireEvent.press(button);
      });

      await waitFor(() => expect(posts()).toHaveLength(1));
      await act(async () => finish(ok(makeClass())));
      await waitFor(() => expect(mockShow).toHaveBeenCalledTimes(1));
      expect(posts()).toHaveLength(1);
    });

    it.each([
      ["class.cancelled", "This class was already cancelled."],
      ["class.finished", "This class has finished and can't be cancelled."],
    ])(
      "on %s shows its toast, closes the sheet and reloads the class",
      async (key, message) => {
        serveCancel(() => refused(409, key));
        const user = await openSheet();
        const loads = () =>
          fetchMock.mock.calls.filter(([, init]) => init?.method !== "POST")
            .length;
        const before = loads();

        await user.press(confirmButton());

        await waitFor(() => expect(mockShow).toHaveBeenCalledWith(message));
        expect(screen.queryByText("Cancel this class?")).toBeNull();
        await waitFor(() => expect(loads()).toBeGreaterThan(before));
        expect(router.back).not.toHaveBeenCalled();
      },
    );

    it("on a missing class shows its toast and goes back", async () => {
      serveCancel(() => refused(404, "class.notFound"));
      const user = await openSheet();

      await user.press(confirmButton());

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("This class no longer exists."),
      );
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it.each([
      [422, "class.cancellationMessage.max.length"],
      [500, "INTERNAL_SERVER_ERROR"],
    ])(
      "on %s %s shows the generic toast and keeps the sheet usable",
      async (status, key) => {
        serveCancel(() => refused(status, key));
        const user = await openSheet();

        await user.press(confirmButton());

        await waitFor(() =>
          expect(mockShow).toHaveBeenCalledWith(
            "Something went wrong. Please try again.",
          ),
        );
        expect(screen.getByText("Cancel this class?")).toBeOnTheScreen();
        expect(confirmButton()).toBeEnabled();
      },
    );

    it("shows the no-connection toast when there is no answer", async () => {
      serveCancel(() => {
        throw new TypeError("Network request failed");
      });
      const user = await openSheet();

      await user.press(confirmButton());

      await waitFor(() => expect(mockShow).toHaveBeenCalledTimes(1));
      expect(mockShow.mock.calls[0]![0]).not.toBe("Class cancelled");
      expect(confirmButton()).toBeEnabled();
    });

    it("shows nothing when the session expired", async () => {
      const user = await openSheet();
      (api.apiPost as jest.Mock).mockRejectedValueOnce(
        new api.SessionExpiredError(),
      );

      await user.press(confirmButton());

      await waitFor(() => expect(api.apiPost).toHaveBeenCalled());
      expect(mockShow).not.toHaveBeenCalled();
    });
  });
});
