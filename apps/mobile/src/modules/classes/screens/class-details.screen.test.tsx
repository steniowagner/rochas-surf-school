import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router, Stack } from "expo-router";
import type { ReactNode } from "react";
import { Linking } from "react-native";

import { routes } from "@/constants/routes";
import i18n from "@/i18n";
import { insetBehaviorsOf } from "@/navigation/stack-header/header-inset.test-utils";
import { headerTitleOf } from "@/navigation/stack-header/header-title.test-utils";
import { SessionProvider } from "@/providers/session";
import * as api from "@/services/api";

import type { ClassItem } from "../classes.types";
import {
  failure,
  fetchMock,
  glyph,
  ok,
  setupSignedInUser,
  signInAs,
} from "../classes.test-utils";

import { ClassDetailsScreen } from "./class-details.screen";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

// The global sheet mock always renders its content; this one renders it only while visible.
jest.mock("@/components/ui/bottom-modal", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Pressable, View } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    BottomModal: ({ visible, onClose, children }: any) =>
      visible ? (
        <View>
          <Pressable accessibilityLabel="Dismiss sheet" onPress={onClose} />
          {children}
        </View>
      ) : null,
  };
});

jest.mock("expo-router", () => ({
  Stack: {
    // Renders the header's right side, so the tests can reach what the screen puts there.
    Screen: jest.fn(({ options }: { options: { headerRight?: () => unknown } }) =>
      options.headerRight?.() ?? null,
    ),
  },
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: "c-1" }),
}));

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return {
    ...actual,
    apiGet: jest.fn(actual.apiGet),
    apiPost: jest.fn(actual.apiPost),
    apiDelete: jest.fn(actual.apiDelete),
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
  cancellationDeadline: "2026-10-13T20:00:00.000Z",
  location: {
    id: "l-1",
    name: "Praia do Futuro",
    address: "Av. Zezé Diogo, 1000",
    latitude: -3.7442,
    longitude: -38.4617,
  },
  instructors: [
    { id: "u-1", name: "Ana Souza" },
    { id: "i-2", name: "Bruno Lima" },
  ],
  seatsTaken: 0,
  students: [],
  myEnrolment: null,
  ...overrides,
});

const refused = (status: number, key: string) => ({
  ok: false,
  status,
  json: async () => ({ errors: [key] }),
});

const serve = (item: ClassItem) => fetchMock.mockResolvedValue(ok(item));

const renderScreen = async (canEdit?: boolean, canEnrol?: boolean) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  await render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ClassDetailsScreen canEdit={canEdit} canEnrol={canEnrol} />
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

/** The options the screen gave the Stack header on its latest render. */
const headerOptions = () => {
  const calls = jest.mocked(Stack.Screen).mock.calls;

  return (
    calls[calls.length - 1][0] as {
      options: { headerTitle?: () => ReactNode; headerRight?: unknown };
    }
  ).options;
};

describe("ClassDetailsScreen", () => {
  it("shows the class", async () => {
    serve(makeClass());
    await renderScreen();

    expect(await screen.findByText("16:00 – 17:30")).toBeOnTheScreen();
    expect(headerTitleOf(headerOptions().headerTitle)).toBe("Details");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.getByText("Surf")).toBeOnTheScreen();
    expect(screen.getByText("Beginner")).toBeOnTheScreen();
    expect(screen.getByText("Today · 14 Oct")).toBeOnTheScreen();
    expect(screen.getByText("Instructors")).toBeOnTheScreen();
    expect(screen.getByText("AS")).toBeOnTheScreen();
    expect(screen.getByText("BL")).toBeOnTheScreen();
    expect(screen.getByText("Bruno Lima")).toBeOnTheScreen();
    expect(screen.getByText("Max. 8 students · 8 spots left")).toBeOnTheScreen();
    expect(screen.getByText("Notes")).toBeOnTheScreen();
    expect(
      screen.getByText("Ponto de encontro na barraca 3."),
    ).toBeOnTheScreen();
    expect(screen.getByText("Location")).toBeOnTheScreen();
    expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
    expect(screen.getByText("Av. Zezé Diogo, 1000")).toBeOnTheScreen();
    expect(screen.queryByText("In progress")).not.toBeOnTheScreen();
    expect(screen.queryByText("Class finished")).not.toBeOnTheScreen();
  });

  it("insets its scroll view below the header, whatever the header is", async () => {
    await renderScreen();

    expect(insetBehaviorsOf(screen.toJSON())).toContain("automatic");
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
    expect(screen.getByText("Max. 1 student · 1 spot left")).toBeOnTheScreen();
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

  describe("map", () => {
    it("shows the location with a small map, its marker and Directions when it has a point", async () => {
      serve(makeClass());
      await renderScreen();

      expect(await screen.findByText("Av. Zezé Diogo, 1000")).toBeOnTheScreen();
      expect(screen.getByTestId("location-map-preview").props.initialRegion).toMatchObject({
        latitude: -3.7442,
        longitude: -38.4617,
      });
      expect(screen.getByRole("button", { name: "Directions" })).toBeOnTheScreen();
    });

    it("shows only the name and the address when the location has no point", async () => {
      const item = makeClass();
      serve({ ...item, location: { ...item.location, latitude: null, longitude: null } });
      await renderScreen();

      expect(await screen.findByText("Av. Zezé Diogo, 1000")).toBeOnTheScreen();
      expect(screen.queryByTestId("location-map-preview")).toBeNull();
      expect(screen.queryByRole("button", { name: "Directions" })).toBeNull();
    });

    it("shows the same card on a cancelled class", async () => {
      serve(makeClass({ cancelledAt: "2026-10-13T12:00:00.000Z" }));
      await renderScreen();

      expect(await screen.findByTestId("location-map-preview")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Directions" })).toBeOnTheScreen();
    });
  });

  describe("A aula", () => {
    const students = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `s-${index}`,
        name: `Aluno ${index}`,
        photoUrl: null,
        enrolmentId: `e-${index}`,
      }));

    it("groups the instructors, the students and the free seats under The class", async () => {
      serve(makeClass({ seatsTaken: 3, students: students(3) }));
      await renderScreen();

      expect(await screen.findByText("The class")).toBeOnTheScreen();
      expect(screen.getByText("Bruno Lima")).toBeOnTheScreen();
      expect(screen.getByText("3 students confirmed")).toBeOnTheScreen();
      expect(screen.getAllByLabelText(/^Aluno/)).toHaveLength(3);
      expect(screen.getByText("Max. 8 students · 5 spots left")).toBeOnTheScreen();
    });

    it("reads No students yet and does not expand for a class without students", async () => {
      const user = userEvent.setup();
      serve(makeClass());
      await renderScreen();

      await user.press(await screen.findByText("No students yet"));

      expect(screen.getByRole("button", { name: /No students yet/ })).toBeDisabled();
      expect(screen.queryByText(glyph("chevron-down"))).not.toBeOnTheScreen();
    });

    it("shows 5 avatars and +N, and opens the list of every student when the row is pressed", async () => {
      const user = userEvent.setup();
      serve(makeClass({ seatsTaken: 7, students: students(7) }));
      await renderScreen();

      expect(await screen.findByText("+2")).toBeOnTheScreen();
      expect(screen.getAllByLabelText(/^Aluno/)).toHaveLength(5);
      expect(screen.queryByText("Aluno 6")).not.toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: /7 students confirmed/ }));

      expect(screen.getByText("Aluno 6")).toBeOnTheScreen();
      expect(screen.getByText(glyph("chevron-up"))).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: /7 students confirmed/ }));

      expect(screen.queryByText("Aluno 6")).not.toBeOnTheScreen();
    });

    it("does not mark the viewer in the list of students", async () => {
      const user = userEvent.setup();
      serve(
        makeClass({
          seatsTaken: 1,
          students: [{ id: "u-1", name: "Ana Souza", photoUrl: null, enrolmentId: "e-1" }],
          instructors: [{ id: "i-2", name: "Bruno Lima" }],
        }),
      );
      await renderScreen();

      await user.press(await screen.findByRole("button", { name: /1 student confirmed/ }));

      expect(screen.getByText("Ana Souza")).toBeOnTheScreen();
      expect(screen.queryByText("You")).not.toBeOnTheScreen();
    });

    it("says sold out in red when the class is full, and counts one spot left in the singular", async () => {
      serve(makeClass({ seatsTaken: 8 }));
      await renderScreen();
      expect(await screen.findByText("Max. 8 students · sold out")).toBeOnTheScreen();
      expect(screen.getByText("Max. 8 students · sold out").props.className).toContain("text-bad");

      serve(makeClass({ seatsTaken: 7 }));
      await renderScreen();
      expect(await screen.findByText("Max. 8 students · 1 spot left")).toBeOnTheScreen();
    });

    it("reads students present after the end and hides the Max. line when finished or cancelled", async () => {
      serve(makeClass({ startsAt: "2026-10-14T10:00:00.000Z", endsAt: "2026-10-14T11:00:00.000Z", seatsTaken: 2, students: students(2) }));
      await renderScreen();
      expect(await screen.findByText("2 students present")).toBeOnTheScreen();
      expect(screen.queryByText(/^Max\./)).not.toBeOnTheScreen();

      serve(makeClass({ cancelledAt: "2026-10-13T10:00:00.000Z" }));
      await renderScreen();
      await screen.findByText("Class cancelled");
      expect(screen.queryByText(/^Max\./)).not.toBeOnTheScreen();
    });
  });

  describe("full class banner", () => {
    it("shows Class full for a class to come with every seat taken", async () => {
      serve(makeClass({ seatsTaken: 8 }));
      await renderScreen();

      expect(await screen.findByText("Class full")).toBeOnTheScreen();
    });

    it("shows nothing for a class with a free seat", async () => {
      serve(makeClass({ seatsTaken: 7 }));
      await renderScreen();

      await screen.findByText("The class");
      expect(screen.queryByText("Class full")).not.toBeOnTheScreen();
    });

    it.each([
      ["started", { startsAt: "2026-10-14T12:00:00.000Z", endsAt: "2026-10-14T14:00:00.000Z" }],
      ["finished", { startsAt: "2026-10-14T10:00:00.000Z", endsAt: "2026-10-14T11:00:00.000Z" }],
      ["cancelled", { cancelledAt: "2026-10-13T10:00:00.000Z" }],
    ])("shows nothing for a %s class", async (_label, overrides) => {
      serve(makeClass({ seatsTaken: 8, ...overrides }));
      await renderScreen();

      await screen.findByText("The class");
      expect(screen.queryByText("Class full")).not.toBeOnTheScreen();
    });
  });

  describe("no instructor", () => {
    const alone = (overrides: Partial<ClassItem> = {}) =>
      makeClass({ instructors: [], ...overrides });

    it("shows an admin the banner, which opens the editor, and No instructor assigned", async () => {
      (router.push as jest.Mock).mockReset();
      const user = userEvent.setup();
      serve(alone());
      await renderScreen(true);

      expect(await screen.findByText("No instructor")).toBeOnTheScreen();
      expect(screen.getByText("Assign an instructor before the class.")).toBeOnTheScreen();
      expect(screen.getByText(glyph("person-remove-outline"))).toBeOnTheScreen();
      expect(screen.getByText("No instructor assigned")).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: /No instructor/ }));

      expect(router.push).toHaveBeenCalledWith(routes.admin.editClass("c-1"));
    });

    it("shows a student or an instructor no banner, only No instructor assigned", async () => {
      serve(alone());
      await renderScreen();

      expect(await screen.findByText("No instructor assigned")).toBeOnTheScreen();
      expect(screen.queryByText("No instructor")).not.toBeOnTheScreen();
      expect(screen.queryByText("Assign an instructor before the class.")).not.toBeOnTheScreen();
    });

    it("shows the started banner instead on a started class, keeping No instructor assigned", async () => {
      serve(
        alone({
          startsAt: "2026-10-14T12:00:00.000Z",
          endsAt: "2026-10-14T14:00:00.000Z",
        }),
      );
      await renderScreen(true);

      expect(await screen.findByText("In progress")).toBeOnTheScreen();
      expect(screen.getByText("No instructor assigned")).toBeOnTheScreen();
      expect(screen.queryByText("No instructor")).not.toBeOnTheScreen();
    });

    it("shows no banner on a class with an instructor", async () => {
      serve(makeClass());
      await renderScreen(true);

      expect(await screen.findByText("Bruno Lima")).toBeOnTheScreen();
      expect(screen.queryByText("No instructor")).not.toBeOnTheScreen();
      expect(screen.queryByText("No instructor assigned")).not.toBeOnTheScreen();
    });
  });

  describe("cancellation deadline", () => {
    afterEach(() => i18n.changeLanguage("en-US"));

    it("shows everyone, in pt-BR, until when the class can be cancelled", async () => {
      await i18n.changeLanguage("pt-BR");
      serve(makeClass({ cancellationDeadline: "2026-10-19T23:00:00.000Z" }));
      await renderScreen();

      // Once under the date and once as the value of the cancellation row.
      expect(await screen.findAllByText("Cancelamento até seg, 19 out · 20:00")).toHaveLength(2);
      expect(screen.getByText(glyph("calendar-clear-outline"))).toBeOnTheScreen();
    });

    it("writes the English weekday and month in en-US", async () => {
      serve(makeClass({ cancellationDeadline: "2026-10-19T23:00:00.000Z" }));
      await renderScreen(true);

      // Once under the date and once as the value of the cancellation row.
      expect(await screen.findAllByText("Cancel until Mon, 19 Oct · 20:00")).toHaveLength(2);
    });

    it("uses Fortaleza's time whatever the phone's time zone", async () => {
      serve(makeClass({ cancellationDeadline: "2026-10-14T02:30:00.000Z" }));
      await renderScreen();

      // Once under the date and once as the value of the cancellation row.
      expect(await screen.findAllByText("Cancel until Tue, 13 Oct · 23:30")).toHaveLength(2);
    });

    it("shows no line without a deadline", async () => {
      serve(makeClass({ cancellationDeadline: null }));
      await renderScreen();

      expect(await screen.findByText("Bruno Lima")).toBeOnTheScreen();
      expect(screen.queryByText(/Cancel until/)).not.toBeOnTheScreen();
    });

    it("shows no line on a cancelled class", async () => {
      serve(
        makeClass({
          cancellationDeadline: "2026-10-19T23:00:00.000Z",
          cancelledAt: "2026-10-13T10:00:00.000Z",
        }),
      );
      await renderScreen();

      expect(await screen.findByText("Class cancelled")).toBeOnTheScreen();
      expect(screen.queryByText(/Cancel until/)).not.toBeOnTheScreen();
    });
  });

  describe("no deadline", () => {
    const unset = (overrides: Partial<ClassItem> = {}) =>
      makeClass({ cancellationDeadline: null, ...overrides });

    it("shows an admin the banner naming the discipline, which opens the rules screen", async () => {
      (router.push as jest.Mock).mockReset();
      const user = userEvent.setup();
      serve(unset());
      await renderScreen(true);

      expect(await screen.findByText("No cancellation deadline")).toBeOnTheScreen();
      expect(
        screen.getByText("We couldn't work out yet until when students can cancel. Check the surf rule."),
      ).toBeOnTheScreen();
      expect(screen.getByText(glyph("calendar-clear-outline"))).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: /No cancellation deadline/ }));

      expect(router.push).toHaveBeenCalledWith(routes.admin.cancellationRules);
    });

    it("names skate for a skate class", async () => {
      serve(unset({ discipline: "skate" }));
      await renderScreen(true);

      expect(await screen.findByText(/Check the skate rule\./)).toBeOnTheScreen();
    });

    it("puts it after the No instructor banner when both apply", async () => {
      serve(unset({ instructors: [] }));
      await renderScreen(true);

      const titles = (await screen.findAllByText(/^(No instructor|No cancellation deadline)$/)).map(
        (node) => node.props.children,
      );
      expect(titles).toEqual(["No instructor", "No cancellation deadline"]);
    });

    it("shows a student or an instructor no banner", async () => {
      serve(unset());
      await renderScreen();

      expect(await screen.findByText("Bruno Lima")).toBeOnTheScreen();
      expect(screen.queryByText("No cancellation deadline")).not.toBeOnTheScreen();
    });

    it("shows no banner on a class that has a deadline", async () => {
      serve(makeClass());
      await renderScreen(true);
      expect(await screen.findByText("Bruno Lima")).toBeOnTheScreen();
      expect(screen.queryByText("No cancellation deadline")).not.toBeOnTheScreen();
    });

    it("shows no banner on a started class", async () => {
      serve(unset({ startsAt: "2026-10-14T12:00:00.000Z", endsAt: "2026-10-14T14:00:00.000Z" }));
      await renderScreen(true);

      expect(await screen.findByText("In progress")).toBeOnTheScreen();
      expect(screen.queryByText("No cancellation deadline")).not.toBeOnTheScreen();
    });

    it("shows no banner on a cancelled class", async () => {
      serve(unset({ cancelledAt: "2026-10-13T10:00:00.000Z" }));
      await renderScreen(true);

      expect(await screen.findByText("Class cancelled")).toBeOnTheScreen();
      expect(screen.queryByText("No cancellation deadline")).not.toBeOnTheScreen();
    });
  });

  describe("cancelled", () => {
    const CANCELLED = { cancelledAt: "2026-10-13T10:00:00.000Z" };

    it("shows the banner with the reason in it, instead of the started banner", async () => {
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
      expect(screen.getByText("Mar muito grande.")).toBeOnTheScreen();
      expect(screen.queryByText("This class won't take place.")).toBeNull();
      expect(screen.getByText(glyph("close-circle-outline"))).toBeOnTheScreen();
      expect(screen.queryByText("Message from the team")).toBeNull();
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

    it("shows the default text in the banner without a message", async () => {
      serve(makeClass({ ...CANCELLED, cancellationMessage: null }));
      await renderScreen();

      expect(await screen.findByText("Class cancelled")).toBeOnTheScreen();
      expect(
        screen.getByText("This class won't take place."),
      ).toBeOnTheScreen();
      expect(screen.queryByText("Message from the team")).toBeNull();
    });

    it("shows neither for a class that isn't cancelled", async () => {
      serve(makeClass());
      await renderScreen();

      expect(await screen.findByText("16:00 – 17:30")).toBeOnTheScreen();
      expect(screen.queryByText("Class cancelled")).not.toBeOnTheScreen();
      expect(screen.queryByText("This class won't take place.")).toBeNull();
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
    expect(headerTitleOf(headerOptions().headerTitle)).toBe("Details");
    expect(headerOptions().headerRight).toBeUndefined();
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
      expect(headerOptions().headerRight).toEqual(expect.any(Function));
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
      expect(headerOptions().headerRight).toBeUndefined();
    });

    it("does not show for anyone but an admin", async () => {
      serve(makeClass());
      await renderScreen();

      expect(await screen.findByText("16:00 – 17:30")).toBeOnTheScreen();
      expect(toolsButton()).toBeNull();
      expect(headerOptions().headerRight).toBeUndefined();
    });

    it("does not show while loading", async () => {
      let finish: (value: unknown) => void = () => undefined;
      fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      await renderScreen(true);

      expect(screen.getByTestId("class-details-loading")).toBeOnTheScreen();
      expect(toolsButton()).toBeNull();
      expect(headerOptions().headerRight).toBeUndefined();

      await act(async () => finish(ok(makeClass())));
    });

    it("does not show for a missing class", async () => {
      fetchMock.mockResolvedValue(failure(404));
      await renderScreen(true);

      expect(
        await screen.findByText("This class no longer exists."),
      ).toBeOnTheScreen();
      expect(toolsButton()).toBeNull();
      expect(headerOptions().headerRight).toBeUndefined();
    });
  });

  describe("rules", () => {
    beforeEach(() => (router.push as jest.Mock).mockReset());

    it("shows the cancellation row with its deadline and the school rules row", async () => {
      serve(makeClass({ cancellationDeadline: "2026-10-13T20:00:00.000Z" }));
      await renderScreen();

      expect(await screen.findByText("Rules")).toBeOnTheScreen();
      expect(screen.getByText("Cancellation · Surf")).toBeOnTheScreen();
      expect(screen.getAllByText(/^Cancel until /)).toHaveLength(2);
      expect(screen.getByText("School rules")).toBeOnTheScreen();
    });

    it("names skate and reads Read the rule when the class has no deadline", async () => {
      serve(makeClass({ discipline: "skate", cancellationDeadline: null }));
      await renderScreen();

      expect(await screen.findByText("Cancellation · Skate")).toBeOnTheScreen();
      expect(screen.getByText("Read the rule")).toBeOnTheScreen();
    });

    it("opens the cancellation rules sheet from the cancellation row", async () => {
      const user = userEvent.setup();
      serve(makeClass());
      await renderScreen();

      expect(screen.queryByText("Cancellation rules")).not.toBeOnTheScreen();
      await user.press(await screen.findByRole("button", { name: "Cancellation · Surf" }));

      expect(await screen.findByText("Cancellation rules")).toBeOnTheScreen();
    });

    it("closes the cancellation rules sheet", async () => {
      const user = userEvent.setup();
      serve(makeClass());
      await renderScreen();

      await user.press(await screen.findByRole("button", { name: "Cancellation · Surf" }));
      await screen.findByText("Cancellation rules");
      await user.press(screen.getByLabelText("Dismiss sheet"));

      expect(screen.queryByText("Cancellation rules")).not.toBeOnTheScreen();
    });

    it("opens the student school rules when the role is unknown", async () => {
      const user = userEvent.setup();
      signInAs(undefined as never);
      serve(makeClass());
      await renderScreen();

      await user.press(await screen.findByRole("button", { name: "School rules" }));

      expect(router.push).toHaveBeenCalledWith(routes.student.schoolRules);
    });

    it.each([
      ["student", routes.student.schoolRules],
      ["instructor", routes.instructor.schoolRules],
      ["admin", routes.admin.schoolRules],
    ] as const)("opens the school rules of the %s flow", async (role, route) => {
      const user = userEvent.setup();
      signInAs(role);
      serve(makeClass());
      await renderScreen();

      await user.press(await screen.findByRole("button", { name: "School rules" }));

      expect(router.push).toHaveBeenCalledWith(route);
    });

    it("is hidden for a cancelled class", async () => {
      serve(makeClass({ cancelledAt: "2026-10-13T10:00:00.000Z" }));
      await renderScreen();

      await screen.findByText("Class cancelled");
      expect(screen.queryByText("Rules")).not.toBeOnTheScreen();
      expect(screen.queryByText("School rules")).not.toBeOnTheScreen();
    });
  });

  describe("read-only note", () => {
    const TEACHES = "Enrolments, cancellations and schedule changes are made by the school";
    const NOT_ASSIGNED = "You aren't assigned to this class — you see everything in read-only mode";

    it("tells an instructor who teaches the class that the school handles the changes", async () => {
      signInAs("instructor", "u-1");
      serve(makeClass());
      await renderScreen();

      expect(await screen.findByText(TEACHES)).toBeOnTheScreen();
      expect(screen.queryByText(NOT_ASSIGNED)).not.toBeOnTheScreen();
    });

    it("tells an instructor who does not teach the class that they see it read-only", async () => {
      signInAs("instructor", "someone-else");
      serve(makeClass());
      await renderScreen();

      expect(await screen.findByText(NOT_ASSIGNED)).toBeOnTheScreen();
      expect(screen.queryByText(TEACHES)).not.toBeOnTheScreen();
    });

    it.each(["student", "admin"] as const)("shows a %s no note", async (role) => {
      signInAs(role);
      serve(makeClass());
      await renderScreen();

      await screen.findByText("The class");
      expect(screen.queryByText(TEACHES)).not.toBeOnTheScreen();
      expect(screen.queryByText(NOT_ASSIGNED)).not.toBeOnTheScreen();
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

  describe("delete", () => {
    const deletes = () =>
      fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE") as [
        string,
        unknown,
      ][];
    const loads = () =>
      fetchMock.mock.calls.filter(([, init]) => init?.method !== "DELETE")
        .length;
    const confirmButton = () =>
      screen.getByRole("button", { name: "Delete class" });
    const noContent = () => ({
      ok: true,
      status: 204,
      json: async () => undefined,
    });

    // The class is served for every GET; the deletion answers as the test says.
    const serveDelete = (
      answer: () => unknown = noContent,
      item: ClassItem = makeClass(),
    ) =>
      fetchMock.mockImplementation(
        async (_url: string, init?: { method?: string }) =>
          init?.method === "DELETE" ? answer() : ok(item),
      );

    async function openTools() {
      const user = userEvent.setup();
      await renderScreen(true);
      await user.press(
        await screen.findByRole("button", { name: "Class tools" }),
      );

      return user;
    }

    async function openSheet() {
      const user = await openTools();
      await user.press(screen.getByRole("button", { name: "Delete class" }));

      return user;
    }

    beforeEach(() => {
      (router.back as jest.Mock).mockClear();
      mockShow.mockClear();
      serveDelete();
    });

    it("offers Delete class below Cancel class on a class that hasn't started", async () => {
      await openTools();

      const labels = screen
        .getAllByRole("button")
        .map((button) => button.props.accessibilityLabel)
        .filter((label) => ["Cancel class", "Delete class"].includes(label));

      expect(screen.getByRole("button", { name: "Delete class" })).toBeOnTheScreen();
      expect(labels).toEqual(["Cancel class", "Delete class"]);
    });

    it("offers no Delete class on a class that has started", async () => {
      serveDelete(
        noContent,
        makeClass({
          startsAt: "2026-10-14T12:00:00.000Z",
          endsAt: "2026-10-14T14:00:00.000Z",
        }),
      );
      await openTools();

      expect(screen.getByRole("button", { name: "Cancel class" })).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Delete class" })).toBeNull();
    });

    it("closes the tools and opens the confirmation sheet with the class line, sending nothing", async () => {
      await openSheet();

      expect(screen.getByText("Delete this class?")).toBeOnTheScreen();
      expect(
        screen.getByText("Surf Beginner · Today · 14 Oct, 16:00 – 17:30 · Praia do Futuro"),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: "Notify students and instructors" }),
      ).toBeNull();
      expect(deletes()).toHaveLength(0);
    });

    it("keeps the class: Keep class closes the sheet without a request", async () => {
      const user = await openSheet();

      await user.press(screen.getByRole("button", { name: "Keep class" }));

      expect(screen.queryByText("Delete this class?")).toBeNull();
      expect(deletes()).toHaveLength(0);
    });

    it("deletes once, shows the toast and leaves the details", async () => {
      const user = await openSheet();

      await user.press(confirmButton());

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Class deleted"));
      expect(deletes()).toHaveLength(1);
      expect(deletes()[0]![0]).toBe("http://api.test/classes/c-1");
      expect(screen.queryByText("Delete this class?")).toBeNull();
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it("sends once on a double press", async () => {
      let finish: (value: unknown) => void = () => undefined;
      fetchMock.mockImplementation(
        async (_url: string, init?: { method?: string }) =>
          init?.method === "DELETE"
            ? new Promise((resolve) => (finish = resolve))
            : ok(makeClass()),
      );
      const user = userEvent.setup();
      await renderScreen(true);
      await user.press(
        await screen.findByRole("button", { name: "Class tools" }),
      );
      await user.press(screen.getByRole("button", { name: "Delete class" }));
      const button = confirmButton();

      await act(async () => {
        void fireEvent.press(button);
        void fireEvent.press(button);
      });

      await waitFor(() => expect(deletes()).toHaveLength(1));
      await act(async () => finish(noContent()));
      await waitFor(() => expect(mockShow).toHaveBeenCalledTimes(1));
      expect(deletes()).toHaveLength(1);
    });

    it("on a class with people switches to Can't delete and offers to cancel it instead", async () => {
      serveDelete(() => refused(409, "class.delete.notEmpty"));
      const user = await openSheet();

      await user.press(confirmButton());

      expect(await screen.findByText("Can't delete")).toBeOnTheScreen();
      expect(mockShow).not.toHaveBeenCalled();
      expect(router.back).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "Delete class" })).toBeNull();

      await user.press(screen.getByRole("button", { name: "Cancel class" }));

      expect(screen.queryByText("Can't delete")).toBeNull();
      expect(screen.getByText("Cancel this class?")).toBeOnTheScreen();
    });

    it("opens in the confirmation variant again after a Can't delete", async () => {
      serveDelete(() => refused(409, "class.delete.notEmpty"));
      const user = await openSheet();
      await user.press(confirmButton());
      await user.press(await screen.findByRole("button", { name: "Keep class" }));

      await user.press(
        await screen.findByRole("button", { name: "Class tools" }),
      );
      await user.press(screen.getByRole("button", { name: "Delete class" }));

      expect(screen.getByText("Delete this class?")).toBeOnTheScreen();
    });

    it.each([
      ["class.started", "The class has started and can't be deleted."],
      ["class.cancelled", "This class was cancelled and can't be deleted."],
    ])(
      "on %s shows its toast, closes the sheet and reloads the class",
      async (key, message) => {
        serveDelete(() => refused(409, key));
        const user = await openSheet();
        const before = loads();

        await user.press(confirmButton());

        await waitFor(() => expect(mockShow).toHaveBeenCalledWith(message));
        expect(screen.queryByText("Delete this class?")).toBeNull();
        await waitFor(() => expect(loads()).toBeGreaterThan(before));
        expect(router.back).not.toHaveBeenCalled();
      },
    );

    it("on a missing class shows its toast and goes back", async () => {
      serveDelete(() => refused(404, "class.notFound"));
      const user = await openSheet();

      await user.press(confirmButton());

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("This class no longer exists."),
      );
      expect(router.back).toHaveBeenCalledTimes(1);
    });

    it("on a server error shows the generic toast and keeps the sheet usable", async () => {
      serveDelete(() => refused(500, "INTERNAL_SERVER_ERROR"));
      const user = await openSheet();

      await user.press(confirmButton());

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith(
          "Something went wrong. Please try again.",
        ),
      );
      expect(screen.getByText("Delete this class?")).toBeOnTheScreen();
      expect(confirmButton()).toBeEnabled();
    });

    it("shows the no-connection toast when there is no answer", async () => {
      serveDelete(() => {
        throw new TypeError("Network request failed");
      });
      const user = await openSheet();

      await user.press(confirmButton());

      await waitFor(() => expect(mockShow).toHaveBeenCalledTimes(1));
      expect(mockShow.mock.calls[0]![0]).not.toBe("Class deleted");
      expect(confirmButton()).toBeEnabled();
    });

    it("shows nothing when the session expired", async () => {
      const user = await openSheet();
      (api.apiDelete as jest.Mock).mockRejectedValueOnce(
        new api.SessionExpiredError(),
      );

      await user.press(confirmButton());

      await waitFor(() => expect(api.apiDelete).toHaveBeenCalled());
      expect(mockShow).not.toHaveBeenCalled();
    });
  });
});

describe("ClassDetailsScreen enrol", () => {
  const FULL = { seatsTaken: 8 };
  const mine = (status: NonNullable<ClassItem["myEnrolment"]>["status"]) => ({
    myEnrolment: { id: "e-1", status, requestedAt: "2026-10-13T10:00:00.000Z", reason: null },
  });
  const CREATED = { id: "e-2", classId: "c-1", status: "pending", requestedAt: NOW.toISOString() };
  const RULE = "I read and accept the cancellation rule";

  const posts = () =>
    fetchMock.mock.calls.filter(([, init]) => init?.method === "POST") as [string, { body?: string }][];
  const classLoads = () =>
    fetchMock.mock.calls.filter(
      ([url, init]) => init?.method !== "POST" && String(url).endsWith("/classes/c-1"),
    ).length;
  const ruleLoads = () =>
    fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/cancellation-rules")).length;

  // The class is served for every class GET, the rules for the rules GET, and the POST answers as the test says.
  const serveEnrol = (
    item: ClassItem,
    answer: () => unknown = () => ok(CREATED),
    rules: unknown = { surf: "Cancele até 1 hora antes.", skate: null },
  ) =>
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return answer();
      return String(url).endsWith("/cancellation-rules") ? ok(rules) : ok(item);
    });

  beforeEach(() => mockShow.mockClear());

  async function openRequestSheet(item: ClassItem, label: string) {
    serveEnrol(item);
    const user = userEvent.setup();
    await renderScreen(false, true);
    await user.press(await screen.findByRole("button", { name: label }));

    return user;
  }

  it.each([
    [{}, "Request a seat"],
    [FULL, "Join the waiting list"],
    [{ ...mine("withdrawn") }, "Request again"],
    [{ ...mine("expired"), ...FULL }, "Request again"],
    [{ ...mine("pending") }, "Withdraw request"],
    [{ ...mine("cancelled") }, "Request again"],
    [{ ...mine("pending"), ...FULL }, "Leave the waiting list"],
  ])("enrol: shows the button of the state %j: %s", async (overrides, label) => {
    serveEnrol(makeClass(overrides));
    await renderScreen(false, true);

    expect(await screen.findByRole("button", { name: label })).toBeOnTheScreen();
    expect(screen.getAllByRole("button").filter((button) => button.props.accessibilityLabel === label)).toHaveLength(1);
  });

  it.each([
    ["a class that started", { startsAt: "2026-10-14T12:00:00.000Z", endsAt: "2026-10-14T20:00:00.000Z" }],
    ["a class that finished", { startsAt: "2026-10-14T10:00:00.000Z", endsAt: "2026-10-14T11:00:00.000Z" }],
    ["a cancelled class", { cancelledAt: "2026-10-13T10:00:00.000Z" }],
    ["a class cancelled with the student's request", { cancelledAt: "2026-10-13T10:00:00.000Z", ...mine("classCancelled") }],
    ["an approved enrolment", mine("approved")],
    ["a student taken out", mine("takenOut")],
  ])("enrol: shows no button for %s", async (_name, overrides) => {
    serveEnrol(makeClass(overrides));
    await renderScreen(false, true);
    await screen.findByText("Surf");

    for (const label of ["Request a seat", "Join the waiting list", "Request again", "Withdraw request", "Leave the waiting list"]) {
      expect(screen.queryByRole("button", { name: label })).toBeNull();
    }
  });

  it("enrol: shows no button, sheet or banner to instructors and admins (no canEnrol)", async () => {
    serveEnrol(makeClass(mine("pending")));
    await renderScreen(true, false);
    await screen.findByText("16:00 – 17:30");

    expect(screen.queryByRole("button", { name: "Withdraw request" })).toBeNull();
    expect(screen.queryByText("Request pending")).toBeNull();
  });

  it("enrol: opens the request sheet with the class line, the deadline and Send request disabled until the rule is ticked", async () => {
    await openRequestSheet(makeClass(), "Request a seat");

    expect(screen.getAllByText("Request a seat")).toHaveLength(2);
    expect(
      screen.getByText("Surf Beginner · Today · 14 Oct · 16:00. Your request stays pending until the school confirms."),
    ).toBeOnTheScreen();
    // The details line, the rules row and the sheet card.
    expect(screen.getAllByText("Cancel until Tue, 13 Oct · 17:00")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Send request" })).toBeDisabled();
  });

  it("enrol: sends the acceptance once the rule is ticked, closes the sheet, shows the toast and reloads the class", async () => {
    const user = await openRequestSheet(makeClass(), "Request a seat");
    const loadsBefore = classLoads();

    await user.press(await screen.findByRole("checkbox", { name: RULE }));
    await user.press(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Request sent"));
    expect(posts()).toHaveLength(1);
    expect(posts()[0]![0]).toBe("http://api.test/classes/c-1/enrolments");
    expect(JSON.parse(posts()[0]![1].body!)).toEqual({ acceptCancellationRule: true });
    expect(screen.queryByRole("button", { name: "Send request" })).toBeNull();
    await waitFor(() => expect(classLoads()).toBeGreaterThan(loadsBefore));
  });

  it("enrol: reads the full class as the waiting list and thanks with its toast", async () => {
    const user = await openRequestSheet(makeClass(FULL), "Join the waiting list");

    expect(
      screen.getByText(
        "Surf Beginner · Today · 14 Oct · 16:00. The class is full: your request goes on the waiting list. If a seat opens, it goes to the school for approval.",
      ),
    ).toBeOnTheScreen();
    await user.press(await screen.findByRole("checkbox", { name: RULE }));
    await user.press(screen.getAllByRole("button", { name: "Join the waiting list" }).at(-1)!);

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("You're on the waiting list"));
  });

  it("enrol: sends no checkbox and enables the button when the discipline has no rule", async () => {
    serveEnrol(makeClass(), () => ok(CREATED), { surf: null, skate: null });
    const user = userEvent.setup();
    await renderScreen(false, true);
    await user.press(await screen.findByRole("button", { name: "Request a seat" }));

    expect(await screen.findByText("The school hasn't written this rule yet.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Request sent"));
  });

  it("enrol: sends once on a double press", async () => {
    let finish: (value: unknown) => void = () => undefined;
    const user = await openRequestSheet(makeClass(), "Request a seat");
    serveEnrol(makeClass(), () => new Promise((resolve) => (finish = resolve)) as never);
    await user.press(await screen.findByRole("checkbox", { name: RULE }));
    const send = screen.getByRole("button", { name: "Send request" });

    await act(async () => {
      void fireEvent.press(send);
      void fireEvent.press(send);
    });

    await waitFor(() => expect(posts()).toHaveLength(1));
    await act(async () => finish(ok(CREATED)));
    await waitFor(() => expect(mockShow).toHaveBeenCalledTimes(1));
    expect(posts()).toHaveLength(1);
  });

  it.each([
    ["class.started", 409, "The class has already started."],
    ["class.cancelled", 409, "This class was cancelled."],
    ["enrolment.alreadyOpen", 409, "You already have an open request for this class."],
  ])("enrol: on %s shows its toast, closes the sheet and reloads the class", async (key, status, message) => {
    const user = await openRequestSheet(makeClass(), "Request a seat");
    serveEnrol(makeClass(), () => refused(status, key));
    await user.press(await screen.findByRole("checkbox", { name: RULE }));
    const loadsBefore = classLoads();

    await user.press(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(message));
    expect(screen.queryByRole("button", { name: "Send request" })).toBeNull();
    await waitFor(() => expect(classLoads()).toBeGreaterThan(loadsBefore));
  });

  it("enrol: on enrolment.rule.notAccepted shows its toast, keeps the sheet and reads the rules again", async () => {
    const user = await openRequestSheet(makeClass(), "Request a seat");
    serveEnrol(makeClass(), () => refused(422, "enrolment.rule.notAccepted"));
    await user.press(await screen.findByRole("checkbox", { name: RULE }));
    const rulesBefore = ruleLoads();

    await user.press(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith("The cancellation rule changed. Read it again and accept it."),
    );
    expect(screen.getByRole("button", { name: "Send request" })).toBeOnTheScreen();
    await waitFor(() => expect(ruleLoads()).toBeGreaterThan(rulesBefore));
  });

  it("enrol: on class.notFound shows the missing-class toast and reloads the class", async () => {
    const user = await openRequestSheet(makeClass(), "Request a seat");
    serveEnrol(makeClass(), () => refused(404, "class.notFound"));
    await user.press(await screen.findByRole("checkbox", { name: RULE }));

    await user.press(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("This class no longer exists."));
  });

  it("enrol: shows the no-connection toast when there is no answer and keeps the sheet", async () => {
    const user = await openRequestSheet(makeClass(), "Request a seat");
    serveEnrol(makeClass(), () => {
      throw new TypeError("Network request failed");
    });
    await user.press(await screen.findByRole("checkbox", { name: RULE }));

    await user.press(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again."));
    expect(screen.getByRole("button", { name: "Send request" })).toBeEnabled();
  });

  it("enrol: shows nothing when the session expired", async () => {
    const user = await openRequestSheet(makeClass(), "Request a seat");
    (api.apiPost as jest.Mock).mockRejectedValueOnce(new api.SessionExpiredError());
    await user.press(await screen.findByRole("checkbox", { name: RULE }));

    await user.press(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => expect(api.apiPost).toHaveBeenCalled());
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("enrol: Not now closes the sheet without a request", async () => {
    const user = await openRequestSheet(makeClass(), "Request a seat");

    await user.press(screen.getByRole("button", { name: "Not now" }));

    expect(screen.queryByRole("button", { name: "Send request" })).toBeNull();
    expect(posts()).toHaveLength(0);
  });
});

describe("ClassDetailsScreen withdraw", () => {
  const pending = (overrides: Partial<ClassItem> = {}) =>
    makeClass({
      myEnrolment: { id: "e-1", status: "pending", requestedAt: "2026-10-13T10:00:00.000Z", reason: null },
      ...overrides,
    });
  const WITHDRAWN = { id: "e-1", classId: "c-1", status: "withdrawn", requestedAt: "2026-10-13T10:00:00.000Z" };

  const posts = () =>
    fetchMock.mock.calls.filter(([, init]) => init?.method === "POST") as [string, unknown][];
  const classLoads = () =>
    fetchMock.mock.calls.filter(
      ([url, init]) => init?.method !== "POST" && String(url).endsWith("/classes/c-1"),
    ).length;

  const serveWithdraw = (item: ClassItem, answer: () => unknown = () => ok(WITHDRAWN)) =>
    fetchMock.mockImplementation(async (_url: string, init?: { method?: string }) =>
      init?.method === "POST" ? answer() : ok(item),
    );

  beforeEach(() => mockShow.mockClear());

  async function openSheet(item = pending()) {
    serveWithdraw(item);
    const user = userEvent.setup();
    await renderScreen(false, true);
    await user.press(await screen.findByRole("button", { name: "Withdraw request" }));

    return user;
  }

  it("withdraw: asks first, then withdraws, shows the toast and reloads the class", async () => {
    const user = await openSheet();
    const loadsBefore = classLoads();

    expect(screen.getByText("Your request for this class stops waiting for approval.")).toBeOnTheScreen();
    expect(posts()).toHaveLength(0);
    await user.press(screen.getByRole("button", { name: "Yes, withdraw" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Request withdrawn"));
    expect(posts()).toHaveLength(1);
    expect(posts()[0]![0]).toBe("http://api.test/enrolments/e-1/withdraw");
    expect(screen.queryByRole("button", { name: "Yes, withdraw" })).toBeNull();
    await waitFor(() => expect(classLoads()).toBeGreaterThan(loadsBefore));
  });

  it("withdraw: Keep request closes the sheet without a request", async () => {
    const user = await openSheet();

    await user.press(screen.getByRole("button", { name: "Keep request" }));

    expect(screen.queryByRole("button", { name: "Yes, withdraw" })).toBeNull();
    expect(posts()).toHaveLength(0);
  });

  it("withdraw: leaves the waiting list at once, with its toast", async () => {
    serveWithdraw(pending({ seatsTaken: 8 }));
    const user = userEvent.setup();
    await renderScreen(false, true);

    await user.press(await screen.findByRole("button", { name: "Leave the waiting list" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("You left the waiting list"));
    expect(posts()).toHaveLength(1);
    expect(screen.queryByText("Yes, withdraw")).toBeNull();
  });

  it("withdraw: sends once on a double press", async () => {
    let finish: (value: unknown) => void = () => undefined;
    const user = await openSheet();
    serveWithdraw(pending(), () => new Promise((resolve) => (finish = resolve)) as never);
    const confirm = screen.getByRole("button", { name: "Yes, withdraw" });

    await act(async () => {
      void fireEvent.press(confirm);
      void fireEvent.press(confirm);
    });

    await waitFor(() => expect(posts()).toHaveLength(1));
    await act(async () => finish(ok(WITHDRAWN)));
    await waitFor(() => expect(mockShow).toHaveBeenCalledTimes(1));
    expect(posts()).toHaveLength(1);
    expect(user).toBeDefined();
  });

  it.each([
    ["enrolment.notPending", 409, "This request is no longer pending."],
    ["class.started", 409, "The class has already started."],
  ])("withdraw: on %s shows its toast, closes the sheet and reloads the class", async (key, status, message) => {
    const user = await openSheet();
    serveWithdraw(pending(), () => refused(status, key));
    const loadsBefore = classLoads();

    await user.press(screen.getByRole("button", { name: "Yes, withdraw" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(message));
    expect(screen.queryByRole("button", { name: "Yes, withdraw" })).toBeNull();
    await waitFor(() => expect(classLoads()).toBeGreaterThan(loadsBefore));
  });

  it("withdraw: shows the generic toast and keeps the sheet on another failure", async () => {
    const user = await openSheet();
    serveWithdraw(pending(), () => refused(500, "INTERNAL_SERVER_ERROR"));

    await user.press(screen.getByRole("button", { name: "Yes, withdraw" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."));
    expect(screen.getByRole("button", { name: "Yes, withdraw" })).toBeEnabled();
  });
});

describe("ClassDetailsScreen cancel seat", () => {
  const DEADLINE = "2026-10-14T18:00:00.000Z"; // Wed, 14 Oct · 15:00
  const approved = (overrides: Partial<ClassItem> = {}) =>
    makeClass({
      cancellationDeadline: DEADLINE,
      myEnrolment: { id: "e-1", status: "approved", requestedAt: "2026-10-13T10:00:00.000Z", reason: null },
      ...overrides,
    });
  const CANCELLED = { id: "e-1", classId: "c-1", status: "cancelled", requestedAt: "2026-10-13T10:00:00.000Z" };

  const posts = () =>
    fetchMock.mock.calls.filter(([, init]) => init?.method === "POST") as [string, unknown][];
  const classLoads = () =>
    fetchMock.mock.calls.filter(
      ([url, init]) => init?.method !== "POST" && String(url).endsWith("/classes/c-1"),
    ).length;

  const serveCancel = (item: ClassItem, answer: () => unknown = () => ok(CANCELLED)) =>
    fetchMock.mockImplementation(async (_url: string, init?: { method?: string }) =>
      init?.method === "POST" ? answer() : ok(item),
    );

  beforeEach(() => mockShow.mockClear());

  async function openSheet(item = approved()) {
    serveCancel(item);
    const user = userEvent.setup();
    await renderScreen(false, true);
    await user.press(await screen.findByRole("button", { name: "Cancel enrolment" }));

    return user;
  }

  it("cancel seat: asks first with the deadline, then cancels, shows the toast and reloads the class", async () => {
    const user = await openSheet();
    const loadsBefore = classLoads();

    expect(screen.getByText("Your seat is freed. You can cancel until Wed, 14 Oct · 15:00.")).toBeOnTheScreen();
    expect(posts()).toHaveLength(0);
    await user.press(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Enrolment cancelled"));
    expect(posts()).toHaveLength(1);
    expect(posts()[0]![0]).toBe("http://api.test/enrolments/e-1/cancel");
    expect(screen.queryByRole("button", { name: "Yes, cancel" })).toBeNull();
    await waitFor(() => expect(classLoads()).toBeGreaterThan(loadsBefore));
  });

  it("cancel seat: Keep enrolment closes the sheet without a request", async () => {
    const user = await openSheet();

    await user.press(screen.getByRole("button", { name: "Keep enrolment" }));

    expect(screen.queryByRole("button", { name: "Yes, cancel" })).toBeNull();
    expect(posts()).toHaveLength(0);
  });

  it("cancel seat: sends once on a double press", async () => {
    let finish: (value: unknown) => void = () => undefined;
    await openSheet();
    serveCancel(approved(), () => new Promise((resolve) => (finish = resolve)) as never);
    const confirm = screen.getByRole("button", { name: "Yes, cancel" });

    await act(async () => {
      void fireEvent.press(confirm);
      void fireEvent.press(confirm);
    });

    await waitFor(() => expect(posts()).toHaveLength(1));
    await act(async () => finish(ok(CANCELLED)));
    await waitFor(() => expect(mockShow).toHaveBeenCalledTimes(1));
    expect(posts()).toHaveLength(1);
  });

  it.each([
    ["enrolment.notApproved", "This seat is no longer approved."],
    ["class.started", "The class has already started."],
  ])("cancel seat: on %s shows its toast, closes the sheet and reloads the class", async (key, message) => {
    const user = await openSheet();
    serveCancel(approved(), () => refused(409, key));
    const loadsBefore = classLoads();

    await user.press(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(message));
    expect(screen.queryByRole("button", { name: "Yes, cancel" })).toBeNull();
    await waitFor(() => expect(classLoads()).toBeGreaterThan(loadsBefore));
  });

  it.each(["enrolment.deadline.passed", "enrolment.deadline.missing"])(
    "cancel seat: on %s closes the sheet and reloads the class without a toast",
    async (key) => {
      const user = await openSheet();
      serveCancel(approved(), () => refused(409, key));
      const loadsBefore = classLoads();

      await user.press(screen.getByRole("button", { name: "Yes, cancel" }));

      await waitFor(() => expect(classLoads()).toBeGreaterThan(loadsBefore));
      expect(screen.queryByRole("button", { name: "Yes, cancel" })).toBeNull();
      expect(mockShow).not.toHaveBeenCalled();
    },
  );

  it("cancel seat: shows the generic toast and keeps the sheet on another failure", async () => {
    const user = await openSheet();
    serveCancel(approved(), () => refused(500, "INTERNAL_SERVER_ERROR"));

    await user.press(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."));
    expect(screen.getByRole("button", { name: "Yes, cancel" })).toBeEnabled();
  });

  it("cancel seat: shows the cancelled banner and offers to request again", async () => {
    serveCancel(
      approved({ myEnrolment: { id: "e-1", status: "cancelled", requestedAt: "2026-10-13T10:00:00.000Z", reason: null } }),
    );
    await renderScreen(false, true);

    const banner = (await screen.findByText("You cancelled your enrolment")).parent!.parent!;
    expect(screen.getByText("Your seat was freed.")).toBeOnTheScreen();
    expect(banner.props.className).toContain("bg-dim");
    expect(screen.getByRole("button", { name: "Request again" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Cancel enrolment" })).toBeNull();
  });

  it("cancel seat: offers no button once the deadline passed, and none without a deadline", async () => {
    serveCancel(approved({ cancellationDeadline: "2026-10-14T13:00:00.000Z" }));
    await renderScreen(false, true);

    await screen.findByText("You're enrolled");
    expect(screen.queryByRole("button", { name: "Cancel enrolment" })).toBeNull();
  });

  it("cancel seat: offers no button without a deadline", async () => {
    serveCancel(approved({ cancellationDeadline: null }));
    await renderScreen(false, true);

    await screen.findByText("You're enrolled");
    expect(screen.queryByRole("button", { name: "Cancel enrolment" })).toBeNull();
  });
});

describe("ClassDetailsScreen deadline notes", () => {
  const approved = (overrides: Partial<ClassItem> = {}) =>
    makeClass({
      myEnrolment: { id: "e-1", status: "approved", requestedAt: "2026-10-13T10:00:00.000Z", reason: null },
      ...overrides,
    });
  const PASSED = "The cancellation deadline ended on Tue, 13 Oct · 17:00. Contact the school.";
  const MISSING = "This class's cancellation deadline hasn't been set yet. Contact the school to cancel.";

  const serveWithSchool = (item: ClassItem, school: () => unknown) =>
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith("/school-settings") ? school() : ok(item),
    );
  const withNumber = () => ok({ whatsappNumber: "+5585999998888" });

  beforeEach(() => {
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  it("deadline: tells a student past the deadline to contact the school and opens the school's chat", async () => {
    serveWithSchool(approved(), withNumber);
    const user = userEvent.setup();
    await renderScreen(false, true);

    expect(await screen.findByText(PASSED)).toBeOnTheScreen();
    await user.press(await screen.findByRole("button", { name: "Contact the school" }));

    expect(Linking.openURL).toHaveBeenCalledWith("https://wa.me/5585999998888");
    expect(screen.queryByRole("button", { name: "Cancel enrolment" })).toBeNull();
  });

  it("deadline: tells a student of a class without a deadline to contact the school", async () => {
    serveWithSchool(approved({ cancellationDeadline: null }), withNumber);
    await renderScreen(false, true);

    expect(await screen.findByText(MISSING)).toBeOnTheScreen();
    expect(await screen.findByRole("button", { name: "Contact the school" })).toBeOnTheScreen();
  });

  it.each([
    ["has no number", () => ok({ whatsappNumber: null })],
    ["fails", () => refused(500, "INTERNAL_SERVER_ERROR")],
  ])("deadline: keeps the note and hides the button when the school's number %s", async (_name, school) => {
    serveWithSchool(approved(), school);
    await renderScreen(false, true);

    expect(await screen.findByText(PASSED)).toBeOnTheScreen();
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/school-settings"))).toBe(true));
    expect(screen.queryByRole("button", { name: "Contact the school" })).toBeNull();
  });

  it.each([
    ["a class that started", { startsAt: "2026-10-14T12:00:00.000Z", endsAt: "2026-10-14T20:00:00.000Z" }],
    ["a cancelled class", { cancelledAt: "2026-10-13T10:00:00.000Z" }],
    ["a deadline still ahead", { cancellationDeadline: "2026-10-14T18:00:00.000Z" }],
  ])("deadline: shows no note for %s", async (_name, overrides) => {
    serveWithSchool(approved(overrides), withNumber);
    await renderScreen(false, true);
    await screen.findByText("Surf");

    expect(screen.queryByText(PASSED)).toBeNull();
    expect(screen.queryByText(MISSING)).toBeNull();
    expect(screen.queryByRole("button", { name: "Contact the school" })).toBeNull();
  });

  it("deadline: shows no note for other statuses", async () => {
    serveWithSchool(
      approved({ myEnrolment: { id: "e-1", status: "pending", requestedAt: "2026-10-13T10:00:00.000Z", reason: null } }),
      withNumber,
    );
    await renderScreen(false, true);
    await screen.findByText("Surf");

    expect(screen.queryByText(PASSED)).toBeNull();
  });

  it("deadline: turns the cancel button into the note when the deadline passes with the screen open", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-14T17:59:30.000Z") });
    serveWithSchool(approved({ cancellationDeadline: "2026-10-14T18:00:00.000Z" }), withNumber);
    await renderScreen(false, true);
    expect(await screen.findByRole("button", { name: "Cancel enrolment" })).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.queryByRole("button", { name: "Cancel enrolment" })).toBeNull();
    expect(screen.getByText("The cancellation deadline ended on Wed, 14 Oct · 15:00. Contact the school.")).toBeOnTheScreen();
  });
});

describe("ClassDetailsScreen enrolment status", () => {
  const mine = (status: NonNullable<ClassItem["myEnrolment"]>["status"], overrides: Partial<ClassItem> = {}) =>
    makeClass({
      myEnrolment: { id: "e-1", status, requestedAt: "2026-10-13T10:00:00.000Z", reason: null },
      ...overrides,
    });

  it.each([
    [mine("pending"), "Request pending", "Your request is waiting for the school's approval.", "bg-warn-tint"],
    [
      mine("pending", { seatsTaken: 8 }),
      "You're on the waiting list",
      "If a seat opens, your request goes to the school for approval.",
      "bg-info-tint",
    ],
    [mine("withdrawn"), "Request withdrawn", "You withdrew your request for this class.", "bg-dim"],
    [mine("expired"), "You didn't get a seat", "Your request expired without a seat opening in the class.", "bg-dim"],
    [mine("approved"), "You're enrolled", "Your seat is secured.", "bg-ok-tint"],
    [mine("denied"), "Request denied", "Tap to see the reason.", "bg-bad-tint"],
  ])("status: shows the banner of the latest enrolment: %#", async (item, title, description, tint) => {
    fetchMock.mockResolvedValue(ok(item));
    await renderScreen(false, true);

    const banner = (await screen.findByText(title)).parent!.parent!;
    expect(screen.getByText(description)).toBeOnTheScreen();
    expect(banner.props.className).toContain(tint);
    expect(screen.queryByText("Class full")).toBeNull();
  });

  it("status: keeps Class full and invites a student without an enrolment to the waiting list", async () => {
    fetchMock.mockResolvedValue(ok(makeClass({ seatsTaken: 8 })));
    await renderScreen(false, true);

    expect(await screen.findByText("Class full")).toBeOnTheScreen();
    expect(screen.getByText("You can join the waiting list.")).toBeOnTheScreen();
  });

  it("status: does not invite instructors and admins to the waiting list", async () => {
    fetchMock.mockResolvedValue(ok(makeClass({ seatsTaken: 8 })));
    await renderScreen(true, false);

    expect(await screen.findByText("Class full")).toBeOnTheScreen();
    expect(screen.queryByText("You can join the waiting list.")).toBeNull();
  });

  it("status: shows no enrolment banner on a cancelled class, only its own", async () => {
    fetchMock.mockResolvedValue(ok(mine("pending", { cancelledAt: "2026-10-13T10:00:00.000Z" })));
    await renderScreen(false, true);

    expect(await screen.findByText("Class cancelled")).toBeOnTheScreen();
    expect(screen.queryByText("Request pending")).toBeNull();
  });

  it.each([
    ["started", { startsAt: "2026-10-14T12:00:00.000Z", endsAt: "2026-10-14T20:00:00.000Z" }],
    ["finished", { startsAt: "2026-10-14T10:00:00.000Z", endsAt: "2026-10-14T11:00:00.000Z" }],
  ])("status: lets the %s banner win over the pending one", async (_name, overrides) => {
    fetchMock.mockResolvedValue(ok(mine("pending", overrides)));
    await renderScreen(false, true);

    await screen.findByText("Surf");
    expect(screen.queryByText("Request pending")).toBeNull();
  });

  it("status: shows no banner for the statuses of the later specs", async () => {
    fetchMock.mockResolvedValue(ok(mine("takenOut")));
    await renderScreen(false, true);

    await screen.findByText("16:00 – 17:30");
    expect(screen.queryByText("You're enrolled")).toBeNull();
    expect(screen.queryByText("Request denied")).toBeNull();
  });

  it("decision: an approved student has no button, and the started banner wins over the approved one", async () => {
    fetchMock.mockResolvedValue(ok(mine("approved")));
    await renderScreen(false, true);

    expect(await screen.findByText("You're enrolled")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Request again" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Withdraw request" })).toBeNull();
  });

  it("decision: an approved class that started shows the started banner and not the approved one", async () => {
    fetchMock.mockResolvedValue(
      ok(mine("approved", { startsAt: "2026-10-14T12:00:00.000Z", endsAt: "2026-10-14T20:00:00.000Z" })),
    );
    await renderScreen(false, true);

    await screen.findByText("Surf");
    expect(screen.queryByText("You're enrolled")).toBeNull();
  });

  it("decision: a denied request opens the reason as written from its banner, and 'Request again' is offered", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      ok(
        makeClass({
          myEnrolment: {
            id: "e-1",
            status: "denied",
            requestedAt: "2026-10-13T10:00:00.000Z",
            reason: "This class is advanced level.",
          },
        }),
      ),
    );
    await renderScreen(false, true);

    await user.press(await screen.findByRole("button", { name: /Request denied/ }));

    expect(screen.getByText("Reason from the school")).toBeOnTheScreen();
    expect(screen.getByText("This class is advanced level.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Request again" })).toBeOnTheScreen();
  });

  it("decision: a denial without a reason says so", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(ok(mine("denied")));
    await renderScreen(false, true);

    await user.press(await screen.findByRole("button", { name: /Request denied/ }));

    expect(screen.getByText("No reason given.")).toBeOnTheScreen();
  });

  it.each([
    ["has started", { startsAt: "2026-10-14T12:00:00.000Z", endsAt: "2026-10-14T20:00:00.000Z" }],
    ["was cancelled", { cancelledAt: "2026-10-13T10:00:00.000Z" }],
  ])("decision: a denial stays on a class that %s, without 'Request again'", async (_name, overrides) => {
    fetchMock.mockResolvedValue(ok(mine("denied", overrides)));
    await renderScreen(false, true);

    expect(await screen.findByRole("button", { name: /Request denied/ })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Request again" })).toBeNull();
  });

  describe("take out", () => {
    const NOT_STARTED = {
      startsAt: "2026-10-15T11:00:00.000Z", // tomorrow, 08:00
      endsAt: "2026-10-15T12:00:00.000Z", // 09:00
    };
    const roster = [
      { id: "s-ana", name: "Ana Souza", photoUrl: null, enrolmentId: "e-ana" },
      { id: "s-bia", name: "Bia Lima", photoUrl: null, enrolmentId: "e-bia" },
    ];
    const upcoming = (overrides: Partial<ClassItem> = {}) =>
      makeClass({ ...NOT_STARTED, seatsTaken: 2, students: roster, ...overrides });
    const posts = () =>
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST") as [string, { body: string }][];
    const serveTakeOut = (answer: () => unknown = () => ok({ id: "e-ana", classId: "c-1", status: "takenOut" })) =>
      fetchMock.mockImplementation(async (_url: string, init?: { method?: string }) =>
        init?.method === "POST" ? answer() : ok(upcoming()),
      );

    async function openSheet() {
      const user = userEvent.setup();
      await renderScreen(true);
      await user.press(await screen.findByRole("button", { name: /Students? confirmed|2 students/ }));
      await user.press(screen.getByRole("button", { name: "Take out Ana Souza" }));

      return user;
    }

    beforeEach(() => {
      mockShow.mockClear();
      serveTakeOut();
    });

    it("gives every student of an upcoming class a Take out button, for an admin", async () => {
      const user = userEvent.setup();
      await renderScreen(true);

      await user.press(await screen.findByRole("button", { name: /2 students/ }));

      expect(screen.getByRole("button", { name: "Take out Ana Souza" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Take out Bia Lima" })).toBeOnTheScreen();
    });

    it.each([
      ["a student", false, upcoming()],
      ["a class that started", true, upcoming({ startsAt: "2026-10-14T12:00:00.000Z", endsAt: "2026-10-14T20:00:00.000Z" })],
      ["a class that finished", true, upcoming({ startsAt: "2026-10-14T10:00:00.000Z", endsAt: "2026-10-14T11:00:00.000Z" })],
      ["a cancelled class", true, upcoming({ cancelledAt: "2026-10-13T10:00:00.000Z" })],
    ])("shows no Take out button for %s", async (_name, canEdit, item) => {
      const user = userEvent.setup();
      serve(item);
      await renderScreen(canEdit, !canEdit);

      await user.press(await screen.findByRole("button", { name: /2 students/ }));

      expect(screen.queryByRole("button", { name: /^Take out/ })).toBeNull();
    });

    it("names the first name and the class in the sheet", async () => {
      await openSheet();

      expect(screen.getByText("Take Ana out of the class?")).toBeOnTheScreen();
      expect(
        screen.getByText(
          /^Surf Beginner · Tomorrow · 15 Oct, 08:00 – 09:00\. The spot becomes free\./,
        ),
      ).toBeOnTheScreen();
    });

    it("takes the student out with the reason, shows the toast and reloads the class", async () => {
      const user = await openSheet();
      await user.type(screen.getByLabelText("Reason (optional)"), "Advanced class.");

      await user.press(screen.getByRole("button", { name: "Take out of the class" }));

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Ana Souza taken out · student notified"));
      expect(posts()).toHaveLength(1);
      expect(posts()[0][0]).toBe("http://api.test/enrolments/e-ana/take-out");
      expect(posts()[0][1].body).toBe(JSON.stringify({ reason: "Advanced class." }));
      expect(screen.queryByText("Take Ana out of the class?")).toBeNull();
    });

    it("sends no reason when none was written", async () => {
      const user = await openSheet();

      await user.press(screen.getByRole("button", { name: "Take out of the class" }));

      await waitFor(() => expect(posts()).toHaveLength(1));
      expect(posts()[0][1].body).toBe("{}");
    });

    it("sends once while the request is on its way", async () => {
      let finish: (value: unknown) => void = () => undefined;
      const pending = new Promise((resolve) => {
        finish = resolve;
      });
      serveTakeOut(() => pending);
      const user = await openSheet();

      await user.press(screen.getByRole("button", { name: "Take out of the class" }));
      await user.press(screen.getByRole("button", { name: "Take out of the class" }));

      expect(posts()).toHaveLength(1);
      finish(ok({ id: "e-ana", classId: "c-1", status: "takenOut" }));
      await waitFor(() => expect(mockShow).toHaveBeenCalled());
    });

    it.each([
      ["enrolment.notApproved", "This spot is no longer approved."],
      ["class.started", "The class has already started."],
    ])("shows the toast for %s, closes the sheet and reloads the class", async (key, message) => {
      serveTakeOut(() => refused(409, key));
      const user = await openSheet();
      const loads = fetchMock.mock.calls.filter(([, init]) => init?.method !== "POST").length;

      await user.press(screen.getByRole("button", { name: "Take out of the class" }));

      await waitFor(() => expect(mockShow).toHaveBeenCalledWith(message));
      expect(screen.queryByText("Take Ana out of the class?")).toBeNull();
      await waitFor(() =>
        expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== "POST").length).toBeGreaterThan(loads),
      );
    });

    it("keeps the sheet open on any other failure", async () => {
      serveTakeOut(() => failure(500));
      const user = await openSheet();

      await user.press(screen.getByRole("button", { name: "Take out of the class" }));

      await waitFor(() => expect(mockShow).toHaveBeenCalledTimes(1));
      expect(screen.getByText("Take Ana out of the class?")).toBeOnTheScreen();
    });
  });
});
