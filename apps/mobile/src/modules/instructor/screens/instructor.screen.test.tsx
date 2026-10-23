import { screen, userEvent } from "@testing-library/react-native";
import { Slot } from "expo-router";
import { renderRouter } from "expo-router/testing-library";

import InstructorHomeLayout from "@/app/(private)/instructor/(tabs)/(home)/_layout";
import InstructorRoute from "@/app/(private)/instructor/(tabs)/(home)/index";
import InstructorLayout from "@/app/(private)/instructor/_layout";
import InstructorMyClassesRoute from "@/app/(private)/instructor/my-classes";
import InstructorPeopleRoute from "@/app/(private)/instructor/people";
import InstructorSchoolRulesRoute from "@/app/(private)/instructor/school-rules";
import { routes } from "@/constants/routes";
import { buildClassItem } from "@/modules/classes/classes.test-utils";
import { SessionProvider } from "@/providers/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { hydrateSession } from "@/services/session/session.store";

const fetchMock = jest.fn();

const SCHOOL_RULES = {
  version: 1,
  rules: Array.from({ length: 6 }, (_, index) => ({
    id: `r-${index + 1}`,
    title: `Rule ${index + 1}`,
    description: `Explanation ${index + 1}`,
    index: index + 1,
  })),
};

// Three classes far ahead and a cancelled one, which the "My classes" row doesn't count.
const TEACHING = {
  items: [
    buildClassItem("c-1", "2099-10-15T11:00:00.000Z", "2099-10-15T12:00:00.000Z"),
    buildClassItem("c-2", "2099-10-16T11:00:00.000Z", "2099-10-16T12:00:00.000Z"),
    buildClassItem("c-3", "2099-10-17T11:00:00.000Z", "2099-10-17T12:00:00.000Z"),
    buildClassItem("c-4", "2099-10-18T11:00:00.000Z", "2099-10-18T12:00:00.000Z", {
      cancelledAt: "2099-10-01T12:00:00.000Z",
    }),
  ],
  teachesAny: true,
};
let teaching: typeof TEACHING | null = TEACHING;

// The Rules and My classes rows ask for the school rules and the classes taught on their own: they are answered here
// (`teaching` null fails), so `fetchMock` sees only the home's other requests.
const fetchWithSchoolRules = (url: string, init: RequestInit) =>
  String(url).endsWith("/school-rules")
    ? Promise.resolve({ ok: true, status: 200, json: async () => SCHOOL_RULES })
    : String(url).endsWith("/classes/teaching")
      ? Promise.resolve(
          teaching
            ? { ok: true, status: 200, json: async () => teaching }
            : { ok: false, status: 500, json: async () => ({ errors: [] }) },
        )
      : fetchMock(url, init);

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: jest.fn() }),
}));

async function openInstructorHome() {
  const app = renderRouter(
    {
      _layout: () => (
        <QueryClientProvider client={new QueryClient()}>
          <SessionProvider>
            <Slot />
          </SessionProvider>
        </QueryClientProvider>
      ),
      "(private)/instructor/_layout": InstructorLayout,
      "(private)/instructor/(tabs)/(home)/_layout": InstructorHomeLayout,
      "(private)/instructor/(tabs)/(home)/index": InstructorRoute,
      "(private)/instructor/my-classes": InstructorMyClassesRoute,
      "(private)/instructor/people": InstructorPeopleRoute,
      "(private)/instructor/school-rules": InstructorSchoolRulesRoute,
    },
    { initialUrl: routes.instructor.home },
  );
  await app;

  return { getPathname: () => app.getPathname() };
}

beforeEach(() => {
  teaching = TEACHING;
  hydrateSession({
    user: {
      id: "instructor-1",
      name: "Bruno Lima",
      role: "instructor",
      status: "approved",
    } as never,
    tokens: {
      accessToken: "at-1",
      accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
      refreshToken: "rt-1",
      refreshTokenExpiresAt: "2099-11-10T12:00:00.000Z",
    },
  });
  // The bell asks for the unread count; everything else is an empty page.
  fetchMock.mockReset().mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () =>
      String(url).endsWith("/notifications/unread-count")
        ? { count: 3 }
        : { items: [], page: 1, perPage: 20, total: 0 },
  }));
  globalThis.fetch = fetchWithSchoolRules as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("InstructorScreen", () => {
  it("shows the user header with the first name and the bell with the unread count", async () => {
    await openInstructorHome();

    expect(screen.getByText("Bruno")).toBeOnTheScreen();
    expect(
      await screen.findByRole("button", { name: "Notifications, 3 unread" }),
    ).toBeOnTheScreen();
  });

  it("shows the Dashboard title and the School section with the People row", async () => {
    await openInstructorHome();

    expect(screen.getByRole("header", { name: "Dashboard" })).toBeOnTheScreen();
    expect(screen.getByText("School")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /People/ })).toBeOnTheScreen();
    expect(screen.getByText("9 on the platform")).toBeOnTheScreen();
    // Only the bell's count besides the Rules row's rules, answered apart.
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://api.test/notifications/unread-count",
    ]);
  });

  it("opens the people directory", async () => {
    const user = userEvent.setup();
    const app = await openInstructorHome();

    await user.press(screen.getByRole("button", { name: /People/ }));

    expect(app.getPathname()).toBe(routes.instructor.people);
    expect(await screen.findByText("No one found")).toBeOnTheScreen();
  });

  it("shows the Rules row under School, after My classes and above People, with the rule count, and opens the read-only rules", async () => {
    const user = userEvent.setup();
    const app = await openInstructorHome();

    expect(await screen.findByText("6 rules for every student")).toBeOnTheScreen();
    const rows = screen.getAllByText(/^(School|My classes|Rules|People)$/);
    expect(rows.map((row) => row.props.children)).toEqual(["School", "My classes", "Rules", "People"]);

    await user.press(screen.getByRole("button", { name: /Rules/ }));

    expect(app.getPathname()).toBe(routes.instructor.schoolRules);
    expect(await screen.findByText("Rule 6")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Move rule/ })).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Add rule" })).not.toBeOnTheScreen();
  });

  it("shows My classes first under School with the classes assigned, a cancelled one not counted, and opens the screen", async () => {
    const user = userEvent.setup();
    const app = await openInstructorHome();

    expect(await screen.findByText("3 classes assigned to you")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: /My classes/ }));

    expect(app.getPathname()).toBe(routes.instructor.myClasses);
    expect(await screen.findByRole("header", { name: "MY CLASSES" })).toBeOnTheScreen();
  });

  it("still shows My classes, without a subtitle, after a failed request", async () => {
    teaching = null;
    await openInstructorHome();

    expect(await screen.findByText("6 rules for every student")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /My classes/ })).toBeOnTheScreen();
    expect(screen.queryByText(/assigned/)).not.toBeOnTheScreen();
  });
});
