import { screen, userEvent } from "@testing-library/react-native";
import { Slot } from "expo-router";
import { renderRouter } from "expo-router/testing-library";

import InstructorHomeLayout from "@/app/(private)/instructor/(tabs)/(home)/_layout";
import InstructorRoute from "@/app/(private)/instructor/(tabs)/(home)/index";
import InstructorLayout from "@/app/(private)/instructor/_layout";
import InstructorPeopleRoute from "@/app/(private)/instructor/people";
import { routes } from "@/constants/routes";
import { SessionProvider } from "@/providers/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { hydrateSession } from "@/services/session/session.store";

const fetchMock = jest.fn();

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
      "(private)/instructor/people": InstructorPeopleRoute,
    },
    { initialUrl: routes.instructor.home },
  );
  await app;

  return { getPathname: () => app.getPathname() };
}

beforeEach(() => {
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
  globalThis.fetch = fetchMock;
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
    // Only the bell's count: the home itself loads nothing.
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
});
