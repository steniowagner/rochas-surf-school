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
import { SessionProvider } from "@/providers/session";
import * as api from "@/services/api";

import type { ClassDetails } from "../classes.types";
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

// The school rules are one shared query of their own; each test says what it answers.
const mockUseSchoolRules = jest.fn();

jest.mock("@/modules/school-rules/hooks/use-school-rules.hook", () => ({
  useSchoolRules: () => mockUseSchoolRules(),
}));

const schoolRules = (count: number) => ({
  data: {
    version: 1,
    rules: Array.from({ length: count }, (_, index) => ({
      id: `r-${index}`,
      title: `Rule ${index}`,
      description: "",
      index,
    })),
  },
});

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

const makeClass = (overrides: Partial<ClassDetails> = {}): ClassDetails => ({
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
    { id: "u-1", name: "Ana Souza", role: "instructor", whatsappNumber: null },
    { id: "i-2", name: "Bruno Lima", role: "admin", whatsappNumber: "+5585988887777" },
  ],
  seatsTaken: 0,
  students: [],
  guests: [],
  myEnrolment: null,
  ...overrides,
});

const refused = (status: number, key: string) => ({
  ok: false,
  status,
  json: async () => ({ errors: [key] }),
});

// The screen also reads the school settings, for the waiting-list switch.
const classRequestCount = () =>
  fetchMock.mock.calls.filter(([url]) => !String(url).endsWith("/school-settings")).length;

const serve = (item: ClassDetails) => fetchMock.mockResolvedValue(ok(item));

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
  mockUseSchoolRules.mockReturnValue(schoolRules(3));
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
    expect(headerOptions().headerTitle).toBeUndefined();
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
    expect(screen.getByText("Where and how")).toBeOnTheScreen();
    expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
    expect(screen.getByText("Av. Zezé Diogo, 1000")).toBeOnTheScreen();
    expect(screen.queryByText("In progress")).not.toBeOnTheScreen();
    expect(screen.queryByText("Class finished")).not.toBeOnTheScreen();
  });

  it("insets its scroll view below the header, whatever the header is", async () => {
    await renderScreen();

    expect(insetBehaviorsOf(screen.toJSON())).toContain("automatic");
  });

  it("draws no icon on the discipline chip", async () => {
    serve(makeClass());
    await renderScreen();

    await screen.findByText("Surf");
    expect(screen.queryByText(glyph("water-outline"))).toBeNull();
  });

  it("shows the skate chip for skate", async () => {
    serve(makeClass({ discipline: "skate" }));
    await renderScreen();

    expect(await screen.findByText("Skate")).toBeOnTheScreen();
    expect(screen.queryByText(glyph("disc-outline"))).toBeNull();
  });

  it("shows the notes in a card with the note icon, line breaks kept", async () => {
    serve(makeClass({ notes: "Ponto de encontro na barraca 3.\nTragam protetor." }));
    await renderScreen();

    expect(await screen.findByText("Notes")).toBeOnTheScreen();
    expect(screen.getByText("Ponto de encontro na barraca 3.\nTragam protetor.")).toBeOnTheScreen();
    expect(screen.getByText(glyph("reader-outline"))).toBeOnTheScreen();
  });

  it("hides the notes when there are none", async () => {
    serve(makeClass({ notes: null }));
    await renderScreen();

    await screen.findByText("16:00 – 17:30");
    expect(screen.queryByText("Notes")).not.toBeOnTheScreen();
    expect(screen.queryByText(glyph("reader-outline"))).not.toBeOnTheScreen();
  });

  it("names the viewer You, and one instructor singular", async () => {
    serve(
      makeClass({
        instructors: [{ id: "u-1", name: "Ana Souza", role: "instructor", whatsappNumber: null }],
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
    expect(screen.getByText(glyph("checkmark"))).toBeOnTheScreen();
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

    it("heads the card with Onde e como in pt-BR and Dónde y cómo in es-ES", async () => {
      serve(makeClass());

      try {
        await i18n.changeLanguage("pt-BR");
        await renderScreen();
        expect(await screen.findByText("Onde e como")).toBeOnTheScreen();
        expect(screen.getByRole("button", { name: "Direções" })).toBeOnTheScreen();

        await i18n.changeLanguage("es-ES");
        expect(await screen.findByText("Dónde y cómo")).toBeOnTheScreen();
      } finally {
        await i18n.changeLanguage("en-US");
      }
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
        whatsappNumber: null,
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
          students: [{ id: "u-1", name: "Ana Souza", photoUrl: null, enrolmentId: "e-1", whatsappNumber: null }],
          instructors: [{ id: "i-2", name: "Bruno Lima", role: "instructor", whatsappNumber: null }],
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
    const alone = (overrides: Partial<ClassDetails> = {}) =>
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

      // As the value of the cancellation row only: the header block no longer repeats it.
      expect(await screen.findAllByText("Até seg, 19 out · 20:00")).toHaveLength(1);
      expect(screen.queryByText(glyph("calendar-clear-outline"))).toBeNull();
    });

    it("writes the English weekday and month in en-US", async () => {
      serve(makeClass({ cancellationDeadline: "2026-10-19T23:00:00.000Z" }));
      await renderScreen(true);

      // As the value of the cancellation row only.
      expect(await screen.findAllByText("Until Mon, 19 Oct · 20:00")).toHaveLength(1);
    });

    it("uses Fortaleza's time whatever the phone's time zone", async () => {
      serve(makeClass({ cancellationDeadline: "2026-10-14T02:30:00.000Z" }));
      await renderScreen();

      // As the value of the cancellation row only.
      expect(await screen.findAllByText("Until Tue, 13 Oct · 23:30")).toHaveLength(1);
    });

    it("shows no line without a deadline", async () => {
      serve(makeClass({ cancellationDeadline: null }));
      await renderScreen();

      expect(await screen.findByText("Bruno Lima")).toBeOnTheScreen();
      expect(screen.queryByText(/^Until /)).not.toBeOnTheScreen();
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
      expect(screen.queryByText(/^Until /)).not.toBeOnTheScreen();
    });
  });

  describe("no deadline", () => {
    const unset = (overrides: Partial<ClassDetails> = {}) =>
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
    expect(headerOptions().headerTitle).toBeUndefined();
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
    await waitFor(() => expect(classRequestCount()).toBe(1));
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

    it("opens the sheet with the four tools, and Edit class opens the editor", async () => {
      const user = userEvent.setup();
      serve(makeClass());
      await renderScreen(true);

      await user.press(
        await screen.findByRole("button", { name: "Class tools" }),
      );

      expect(
        screen.getByRole("button", { name: "Send message" }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Cancel class" }),
      ).toBeOnTheScreen();

      await user.press(screen.getByRole("button", { name: "Edit class" }));

      expect(router.push).toHaveBeenCalledWith(routes.admin.editClass("c-1"));
      expect(screen.queryByRole("button", { name: "Cancel class" })).toBeNull();
    });

    it("counts the other instructors for Send message and Cancel class", async () => {
      const user = userEvent.setup();
      serve(makeClass());
      await renderScreen(true);
      await user.press(
        await screen.findByRole("button", { name: "Class tools" }),
      );

      expect(screen.getByText("1 person")).toBeOnTheScreen();
      expect(screen.getByText("Notifies 1 person")).toBeOnTheScreen();
    });

    it("adds the students and the pending requests, not the guests, to the count", async () => {
      const user = userEvent.setup();
      serve(
        makeClass({
          seatsTaken: 3,
          students: [
            { id: "s-1", name: "Aluno 1", photoUrl: null, enrolmentId: "e-1", whatsappNumber: null },
            { id: "s-2", name: "Aluno 2", photoUrl: null, enrolmentId: "e-2", whatsappNumber: null },
          ],
          guests: [{ id: "g-1", name: "Carolina Reis" }],
          pendingRequests: 2,
        }),
      );
      await renderScreen(true);
      await user.press(
        await screen.findByRole("button", { name: "Class tools" }),
      );

      expect(screen.getByText("5 people")).toBeOnTheScreen();
      expect(screen.getByText("Notifies 5 people")).toBeOnTheScreen();
    });

    it("reads Nobody yet when the viewer teaches it alone and nobody is in it", async () => {
      const user = userEvent.setup();
      serve(
        makeClass({
          instructors: [{ id: "u-1", name: "Ana Souza", role: "admin", whatsappNumber: null }],
        }),
      );
      await renderScreen(true);
      await user.press(
        await screen.findByRole("button", { name: "Class tools" }),
      );

      expect(screen.getByText("Nobody yet")).toBeOnTheScreen();
      expect(screen.getByText("Nobody to notify")).toBeOnTheScreen();
    });

    it("does nothing when Send message is pressed", async () => {
      const user = userEvent.setup();
      serve(makeClass());
      await renderScreen(true);
      await user.press(
        await screen.findByRole("button", { name: "Class tools" }),
      );

      await user.press(
        screen.getByRole("button", { name: "Send message" }),
      );

      expect(router.push).not.toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: "Cancel class" }),
      ).toBeOnTheScreen();
      expect(classRequestCount()).toBe(1);
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
      expect(screen.getByText("Cancellation")).toBeOnTheScreen();
      expect(screen.queryByText(/^Cancellation · /)).not.toBeOnTheScreen();
      expect(screen.getByText("Until Tue, 13 Oct · 17:00")).toBeOnTheScreen();
      expect(screen.getByText("School rules")).toBeOnTheScreen();
    });

    it.each([
      [3, "3 rules for every student"],
      [1, "1 rule for every student"],
    ])("counts %i school rule(s) under the school rules row", async (count, text) => {
      mockUseSchoolRules.mockReturnValue(schoolRules(count));
      serve(makeClass());
      await renderScreen();

      expect(await screen.findByText(text)).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "School rules" })).toBeOnTheScreen();
    });

    it.each([
      ["loading", { data: undefined, isPending: true }],
      ["failed", { data: undefined, isError: true }],
      ["empty", schoolRules(0)],
    ])("shows the school rules row's title only while %s", async (_, answer) => {
      mockUseSchoolRules.mockReturnValue(answer);
      serve(makeClass());
      await renderScreen();

      expect(await screen.findByRole("button", { name: "School rules" })).toBeOnTheScreen();
      expect(screen.queryByText(/for every student/)).not.toBeOnTheScreen();
    });

    it.each([
      ["pt-BR", "2 regras para todos os alunos", "Regras da escola", "Cancelamento", /^Até /],
      ["es-ES", "2 reglas para todos los alumnos", "Reglas de la escuela", "Cancelación", /^Hasta /],
    ])("writes the rows in %s", async (language, text, title, cancellation, until) => {
      await i18n.changeLanguage(language);
      mockUseSchoolRules.mockReturnValue(schoolRules(2));
      serve(makeClass());

      try {
        await renderScreen();

        expect(await screen.findByText(text)).toBeOnTheScreen();
        expect(screen.getByText(title)).toBeOnTheScreen();
        expect(screen.getByText(cancellation)).toBeOnTheScreen();
        expect(screen.getByText(until)).toBeOnTheScreen();
      } finally {
        await i18n.changeLanguage("en-US");
      }
    });

    it("draws the rows with their icons and chevrons", async () => {
      serve(makeClass());
      await renderScreen();

      expect(await screen.findByText(glyph("close-circle-outline"))).toBeOnTheScreen();
      expect(screen.getByText(glyph("shield-outline"))).toBeOnTheScreen();
    });

    it("names skate and reads Read the rule when the class has no deadline", async () => {
      serve(makeClass({ discipline: "skate", cancellationDeadline: null }));
      await renderScreen();

      expect(await screen.findByText("Cancellation")).toBeOnTheScreen();
      expect(screen.queryByText("Cancellation · Skate")).not.toBeOnTheScreen();
      expect(screen.getByText("Read the rule")).toBeOnTheScreen();
    });

    it("opens the cancellation rules sheet from the cancellation row", async () => {
      const user = userEvent.setup();
      serve(makeClass());
      await renderScreen();

      expect(screen.queryByText("Cancellation rules")).not.toBeOnTheScreen();
      await user.press(await screen.findByRole("button", { name: "Cancellation" }));

      expect(await screen.findByText("Cancellation rules")).toBeOnTheScreen();
    });

    it("closes the cancellation rules sheet", async () => {
      const user = userEvent.setup();
      serve(makeClass());
      await renderScreen();

      await user.press(await screen.findByRole("button", { name: "Cancellation" }));
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

    it("warns about the trial guests in the confirmation sheet (trial)", async () => {
      fetchMock.mockImplementation(async () =>
        ok(makeClass({ guests: [{ id: "g-1", name: "Carolina Reis" }] })),
      );

      await openSheet();

      expect(
        screen.getByText("1 trial student has no account and won't get the notice — talk to them on WhatsApp."),
      ).toBeOnTheScreen();
    });

    it("names who the cancellation notifies, without counting the admin (audience)", async () => {
      fetchMock.mockImplementation(async () =>
        ok(
          makeClass({
            students: [
              { id: "s-1", name: "Aluno 1", photoUrl: null, enrolmentId: "e-1", whatsappNumber: null },
              { id: "s-2", name: "Aluno 2", photoUrl: null, enrolmentId: "e-2", whatsappNumber: null },
            ],
            pendingRequests: 1,
          }),
        ),
      );

      await openSheet();

      expect(
        screen.getByText(
          "We'll notify 2 enrolled students, 1 person with a pending request and 1 instructor. It stays on the schedule, marked as cancelled.",
        ),
      ).toBeOnTheScreen();
    });

    it("closes the tools and opens the confirmation sheet", async () => {
      await openSheet();

      expect(screen.getByText("Cancel this class?")).toBeOnTheScreen();
      expect(screen.getByText("Message (optional)")).toBeOnTheScreen();
      expect(
        screen.queryByRole("button", {
          name: "Send message",
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
      item: ClassDetails = makeClass(),
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

    it("reads Nobody enrolled on an empty class that hasn't started", async () => {
      await openTools();

      expect(screen.getByText("Nobody enrolled")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Delete class" })).toBeEnabled();
    });

    it("disables Delete class with Already started on a class that has started", async () => {
      serveDelete(
        noContent,
        makeClass({
          startsAt: "2026-10-14T12:00:00.000Z",
          endsAt: "2026-10-14T14:00:00.000Z",
        }),
      );
      const user = await openTools();

      expect(screen.getByRole("button", { name: "Cancel class" })).toBeOnTheScreen();
      expect(screen.getByText("Already started")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Delete class" })).toBeDisabled();

      await user.press(screen.getByRole("button", { name: "Delete class" }));

      expect(screen.queryByText("Delete this class?")).toBeNull();
    });

    it.each([
      [
        "a student",
        {
          seatsTaken: 1,
          students: [{ id: "s-1", name: "Aluno 1", photoUrl: null, enrolmentId: "e-1", whatsappNumber: null }],
        },
      ],
      ["a guest", { seatsTaken: 1, guests: [{ id: "g-1", name: "Carolina Reis" }] }],
    ])("disables Delete class with Has people enrolled when %s holds a seat", async (_who, overrides) => {
      serveDelete(noContent, makeClass(overrides));
      const user = await openTools();

      expect(screen.getByText("Has people enrolled")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Delete class" })).toBeDisabled();

      await user.press(screen.getByRole("button", { name: "Delete class" }));

      expect(screen.queryByText("Delete this class?")).toBeNull();
      expect(deletes()).toHaveLength(0);
    });

    it("closes the tools and opens the confirmation sheet with the class line, sending nothing", async () => {
      await openSheet();

      expect(screen.getByText("Delete this class?")).toBeOnTheScreen();
      expect(
        screen.getByText("Surf Beginner · Today · 14 Oct, 16:00 – 17:30 · Praia do Futuro"),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: "Send message" }),
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
  const mine = (status: NonNullable<ClassDetails["myEnrolment"]>["status"]) => ({
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
    item: ClassDetails,
    answer: () => unknown = () => ok(CREATED),
    rules: unknown = { surf: "Cancele até 1 hora antes.", skate: null },
  ) =>
    fetchMock.mockImplementation(async (url: string, init?: { method?: string }) => {
      if (init?.method === "POST") return answer();
      return String(url).endsWith("/cancellation-rules") ? ok(rules) : ok(item);
    });

  beforeEach(() => mockShow.mockClear());

  async function openRequestSheet(item: ClassDetails, label: string) {
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
    [{ ...mine("takenOut") }, "Request again"],
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
    // The sheet card, and the rules row in its own words.
    expect(screen.getByText("Cancel until Tue, 13 Oct · 17:00")).toBeOnTheScreen();
    expect(screen.getByText("Until Tue, 13 Oct · 17:00")).toBeOnTheScreen();
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
  const pending = (overrides: Partial<ClassDetails> = {}) =>
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

  const serveWithdraw = (item: ClassDetails, answer: () => unknown = () => ok(WITHDRAWN)) =>
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
  const approved = (overrides: Partial<ClassDetails> = {}) =>
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

  const serveCancel = (item: ClassDetails, answer: () => unknown = () => ok(CANCELLED)) =>
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
  const approved = (overrides: Partial<ClassDetails> = {}) =>
    makeClass({
      myEnrolment: { id: "e-1", status: "approved", requestedAt: "2026-10-13T10:00:00.000Z", reason: null },
      ...overrides,
    });
  const PASSED = "The cancellation deadline ended on Tue, 13 Oct · 17:00. Contact the school.";
  const MISSING = "This class's cancellation deadline hasn't been set yet. Contact the school to cancel.";

  const serveWithSchool = (item: ClassDetails, school: () => unknown) =>
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
  const mine = (status: NonNullable<ClassDetails["myEnrolment"]>["status"], overrides: Partial<ClassDetails> = {}) =>
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

  describe("waiting list off", () => {
    // Answers the school settings with the switch off and everything else with the class.
    const serveWithSwitchOff = (item: ClassDetails) =>
      fetchMock.mockImplementation(async (url: string) =>
        String(url).endsWith("/school-settings")
          ? ok({ whatsappNumber: null, waitingListEnabled: false })
          : ok(item),
      );

    it("shows no button and says the waiting list is closed for a student without an enrolment", async () => {
      serveWithSwitchOff(makeClass({ seatsTaken: 8 }));
      await renderScreen(false, true);

      expect(await screen.findByText("Class full")).toBeOnTheScreen();
      expect(
        await screen.findByText("The waiting list is closed for this class."),
      ).toBeOnTheScreen();
      expect(screen.queryByText("You can join the waiting list.")).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Join the waiting list" }),
      ).toBeNull();
    });

    it("shows no button on a full class after an ended enrolment", async () => {
      serveWithSwitchOff(mine("withdrawn", { seatsTaken: 8 }));
      await renderScreen(false, true);

      await screen.findByText("16:00 – 17:30");
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Request again" })).toBeNull(),
      );
    });

    it("keeps Leave the waiting list for a student already waiting", async () => {
      serveWithSwitchOff(mine("pending", { seatsTaken: 8 }));
      await renderScreen(false, true);

      expect(
        await screen.findByRole("button", { name: "Leave the waiting list" }),
      ).toBeOnTheScreen();
    });

    it("keeps the request on a class with a free seat", async () => {
      serveWithSwitchOff(makeClass({ seatsTaken: 3 }));
      await renderScreen(false, true);

      expect(
        await screen.findByRole("button", { name: "Request a seat" }),
      ).toBeOnTheScreen();
    });

    it("counts a failed settings read as on", async () => {
      fetchMock.mockImplementation(async (url: string) =>
        String(url).endsWith("/school-settings")
          ? failure()
          : ok(makeClass({ seatsTaken: 8 })),
      );
      await renderScreen(false, true);

      expect(
        await screen.findByRole("button", { name: "Join the waiting list" }),
      ).toBeOnTheScreen();
    });

    it("shows the closed text as a toast and reloads when the request is refused", async () => {
      const user = userEvent.setup();
      fetchMock.mockImplementation(async (url: string, init?: { method?: string }) => {
        if (String(url).endsWith("/school-settings")) {
          return ok({ whatsappNumber: null, waitingListEnabled: true });
        }

        return init?.method === "POST"
          ? refused(409, "enrolment.waitingList.closed")
          : ok(makeClass({ seatsTaken: 8 }));
      });
      await renderScreen(false, true);
      await user.press(await screen.findByRole("button", { name: "Join the waiting list" }));
      const classReads = () =>
        fetchMock.mock.calls.filter(
          ([url, init]) => String(url).endsWith("/classes/c-1") && init?.method === "GET",
        ).length;
      const before = classReads();

      await user.press(screen.getAllByRole("button", { name: "Join the waiting list" }).at(-1)!);

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith("The waiting list is closed for this class."),
      );
      await waitFor(() => expect(classReads()).toBeGreaterThan(before));
    });
  });

  describe("full banner", () => {
    it("tells an admin that new requests wait while the switch is on", async () => {
      fetchMock.mockImplementation(async (url: string) =>
        String(url).endsWith("/school-settings")
          ? ok({ whatsappNumber: null, waitingListEnabled: true })
          : ok(makeClass({ seatsTaken: 8 })),
      );
      await renderScreen(true, false);

      expect(await screen.findByText("Class full")).toBeOnTheScreen();
      expect(
        await screen.findByText("New requests join the waiting list."),
      ).toBeOnTheScreen();
    });

    it("tells an admin that the waiting list is off while it is", async () => {
      fetchMock.mockImplementation(async (url: string) =>
        String(url).endsWith("/school-settings")
          ? ok({ whatsappNumber: null, waitingListEnabled: false })
          : ok(makeClass({ seatsTaken: 8 })),
      );
      await renderScreen(true, false);

      expect(
        await screen.findByText("The waiting list is off — nobody can ask."),
      ).toBeOnTheScreen();
    });

    it("keeps the banner without a description for an instructor", async () => {
      serve(makeClass({ seatsTaken: 8 }));
      await renderScreen(false, false);

      expect(await screen.findByText("Class full")).toBeOnTheScreen();
      expect(screen.queryByText("New requests join the waiting list.")).toBeNull();
      expect(screen.queryByText("The waiting list is off — nobody can ask.")).toBeNull();
    });
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

  it("status: shows no banner for a class cancelled with the student's request", async () => {
    fetchMock.mockResolvedValue(ok(mine("classCancelled")));
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
      { id: "s-ana", name: "Ana Souza", photoUrl: null, enrolmentId: "e-ana", whatsappNumber: null },
      { id: "s-bia", name: "Bia Lima", photoUrl: null, enrolmentId: "e-bia", whatsappNumber: null },
    ];
    const upcoming = (overrides: Partial<ClassDetails> = {}) =>
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

describe("ClassDetailsScreen trial guests", () => {
  const NOT_STARTED = {
    startsAt: "2026-10-15T11:00:00.000Z", // tomorrow, 08:00
    endsAt: "2026-10-15T12:00:00.000Z", // 09:00
  };
  const withGuest = (name: string | null, overrides: Partial<ClassDetails> = {}) =>
    makeClass({
      ...NOT_STARTED,
      seatsTaken: 2,
      guests: [
        { id: "g-1", name },
        { id: "g-2", name: null },
      ],
      ...overrides,
    });
  const deletes = () => fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE");
  const serveGuests = (item: ClassDetails, answer: () => unknown = () => ok(undefined)) =>
    fetchMock.mockImplementation(async (_url: string, init?: { method?: string }) =>
      init?.method === "DELETE" ? answer() : ok(item),
    );

  async function openAsAdmin(item = withGuest("Carolina Reis")) {
    const user = userEvent.setup();
    serveGuests(item);
    await renderScreen(true);
    await user.press(await screen.findByRole("button", { name: /2 students/ }));

    return user;
  }

  beforeEach(() => mockShow.mockClear());

  it("shows an admin the guest's name with a Trial chip, and how many seats are trial", async () => {
    await openAsAdmin();

    expect(screen.getByText("Carolina Reis")).toBeOnTheScreen();
    expect(screen.getAllByText("Trial").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/· includes 2 trial$/)).toBeOnTheScreen();
  });

  it("shows a student only Trial, with no Take out button and no trial count", async () => {
    const user = userEvent.setup();
    serveGuests(withGuest(null));
    await renderScreen(false, true);

    await user.press(await screen.findByRole("button", { name: /2 students/ }));

    expect(screen.getAllByText("Trial").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole("button", { name: /^Take out/ })).toBeNull();
    expect(screen.queryByText(/includes/)).toBeNull();
  });

  it("removes the guest after a confirmation, tells the admin and closes the sheet", async () => {
    const user = await openAsAdmin();

    await user.press(screen.getByRole("button", { name: "Take out Carolina Reis" }));
    expect(screen.getByText("Take Carolina Reis out of the class?")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Reason (optional)")).toBeNull();
    await user.press(screen.getByRole("button", { name: "Take out of the class" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Carolina Reis taken out"));
    expect(deletes()).toHaveLength(1);
    expect(deletes()[0][0]).toBe("http://api.test/guests/g-1");
    expect(screen.queryByText("Take Carolina Reis out of the class?")).toBeNull();
  });

  it("names a guest whose name is unknown to the admin as Trial", async () => {
    const user = await openAsAdmin(withGuest(null));

    await user.press(screen.getAllByRole("button", { name: "Take out Trial" })[0]);

    expect(screen.getByText("Take Trial out of the class?")).toBeOnTheScreen();
  });

  it("shows the toast when the guest is already gone, closes the sheet and reloads the class", async () => {
    const item = withGuest("Carolina Reis");
    const user = await openAsAdmin(item);
    serveGuests(item, () => refused(404, "guest.notFound"));
    const loads = fetchMock.mock.calls.filter(([, init]) => init?.method !== "DELETE").length;

    await user.press(screen.getByRole("button", { name: "Take out Carolina Reis" }));
    await user.press(screen.getByRole("button", { name: "Take out of the class" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("This guest is no longer in the class."));
    expect(screen.queryByText("Take Carolina Reis out of the class?")).toBeNull();
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([, init]) => init?.method !== "DELETE").length).toBeGreaterThan(loads),
    );
  });
});

describe("ClassDetailsScreen taken out", () => {
  const takenOut = (reason: string | null, overrides: Partial<ClassDetails> = {}) =>
    makeClass({
      myEnrolment: { id: "e-1", status: "takenOut", requestedAt: "2026-10-13T10:00:00.000Z", reason },
      ...overrides,
    });

  it("taken out: shows the banner with the reason on the bad tint and offers to request again", async () => {
    fetchMock.mockResolvedValue(ok(takenOut("This group is advanced level.")));
    await renderScreen(false, true);

    const banner = (await screen.findByText("You were taken out of the class")).parent!.parent!;
    expect(screen.getByText("Reason: “This group is advanced level.”")).toBeOnTheScreen();
    expect(banner.props.className).toContain("bg-bad-tint");
    expect(screen.getByRole("button", { name: "Request again" })).toBeOnTheScreen();
  });

  it("taken out: says no reason was given", async () => {
    fetchMock.mockResolvedValue(ok(takenOut(null)));
    await renderScreen(false, true);

    expect(await screen.findByText("No reason given.")).toBeOnTheScreen();
  });

  it("taken out: offers to join the waiting list again, in the dark button, when the class is full", async () => {
    fetchMock.mockResolvedValue(ok(takenOut(null, { seatsTaken: 8 })));
    await renderScreen(false, true);

    expect(await screen.findByRole("button", { name: "Request again" })).toBeOnTheScreen();
  });

  it.each([
    ["started", { startsAt: "2026-10-14T12:00:00.000Z", endsAt: "2026-10-14T20:00:00.000Z" }],
    ["cancelled", { cancelledAt: "2026-10-13T10:00:00.000Z" }],
  ])("taken out: keeps the banner on a class that %s, without Request again", async (_name, overrides) => {
    fetchMock.mockResolvedValue(ok(takenOut("Advanced.", overrides)));
    await renderScreen(false, true);

    expect(await screen.findByText("You were taken out of the class")).toBeOnTheScreen();
    expect(screen.getByText("Reason: “Advanced.”")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Request again" })).toBeNull();
  });

  it("taken out: shows nothing to an admin or an instructor", async () => {
    fetchMock.mockResolvedValue(ok(takenOut("Advanced.")));
    await renderScreen(true, false);

    await screen.findByText("The class");
    expect(screen.queryByText("You were taken out of the class")).toBeNull();
  });
});

describe("ClassDetailsScreen person sheet", () => {
  const roster = [
    { id: "s-ana", name: "Carla Dias", photoUrl: null, enrolmentId: "e-ana", whatsappNumber: null },
    { id: "s-bia", name: "Bia Lima", photoUrl: null, enrolmentId: "e-bia", whatsappNumber: "+5585977776666" },
  ];
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  afterEach(() => openURL.mockRestore());

  it("opens an instructor's sheet with their role and shared number, which opens WhatsApp", async () => {
    const user = userEvent.setup();
    serve(makeClass());
    await renderScreen();

    await user.press(await screen.findByRole("button", { name: "Bruno Lima" }));

    expect(screen.getByText("Admin")).toBeOnTheScreen();
    expect(screen.getByText("Chat on WhatsApp")).toBeOnTheScreen();
    expect(screen.getByText("+55 85 98888 7777")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Chat on WhatsApp" }));

    expect(openURL).toHaveBeenCalledWith("https://wa.me/5585988887777");
  });

  it("opens the viewer's own pill as an instructor whose number isn't shared", async () => {
    const user = userEvent.setup();
    serve(makeClass());
    await renderScreen();

    await user.press(await screen.findByRole("button", { name: "Ana Souza" }));

    expect(screen.getByText("Instructor")).toBeOnTheScreen();
    expect(screen.getByText("Number not shared.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Chat on WhatsApp" })).toBeNull();
  });

  it("opens a student's sheet with the Student chip, shared or not, and closes it", async () => {
    const user = userEvent.setup();
    serve(makeClass({ seatsTaken: 2, students: roster }));
    await renderScreen();
    await user.press(await screen.findByRole("button", { name: /2 students/ }));

    await user.press(screen.getByRole("button", { name: "Bia Lima" }));

    expect(screen.getByText("Student")).toBeOnTheScreen();
    expect(screen.getByText("+55 85 97777 6666")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Chat on WhatsApp")).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Carla Dias" }));

    expect(screen.getByText("Student")).toBeOnTheScreen();
    expect(screen.getByText("Number not shared.")).toBeOnTheScreen();
  });
});
