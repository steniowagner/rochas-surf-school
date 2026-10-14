import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { Slot } from "expo-router";
import { renderRouter } from "expo-router/testing-library";

import AdminLayout from "@/app/(private)/admin/_layout";
import AdminRoute from "@/app/(private)/admin/(tabs)/index";
import AdminPeopleRoute from "@/app/(private)/admin/people";
import AdminRegistrationsRoute from "@/app/(private)/admin/registrations";
import { routes } from "@/constants/routes";
import { hydrateSession } from "@/services/session/session.store";

const fetchMock = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: jest.fn() }),
}));

function TestRootLayout({ children }: { children?: React.ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false, gcTime: Infinity } },
        })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

const person = (id: string) => ({
  id,
  name: `Person ${id}`,
  email: `${id}@example.com`,
  createdAt: "2026-10-12T10:00:00.000Z",
});

const respondWith = (items: ReturnType<typeof person>[]) =>
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ items }),
  });

async function openAdminHome() {
  const app = renderRouter(
    {
      _layout: () => (
        <TestRootLayout>
          <Slot />
        </TestRootLayout>
      ),
      "(private)/admin/_layout": AdminLayout,
      "(private)/admin/(tabs)/index": AdminRoute,
      "(private)/admin/people": AdminPeopleRoute,
      "(private)/admin/registrations": AdminRegistrationsRoute,
    },
    { initialUrl: routes.admin.home },
  );
  await app;

  return { getPathname: () => app.getPathname() };
}

beforeEach(() => {
  hydrateSession({
    user: { id: "admin-1", role: "admin", status: "approved" } as never,
    tokens: {
      accessToken: "at-1",
      accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
      refreshToken: "rt-1",
      refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
    },
  });
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("AdminScreen", () => {
  it("shows the title and the row with the pending count", async () => {
    respondWith([person("a"), person("b"), person("c")]);
    await openAdminHome();

    expect(
      screen.getByRole("header", { name: "School tools" }),
    ).toBeOnTheScreen();
    expect(await screen.findByText("3 waiting")).toBeOnTheScreen();
    expect(screen.getByText("Join the school")).toBeOnTheScreen();
  });

  it("shows the Tools and School sections, with the People row and its placeholder count", async () => {
    respondWith([]);
    await openAdminHome();

    expect(screen.getByText("Tools")).toBeOnTheScreen();
    expect(screen.getByText("School")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /People/ })).toBeOnTheScreen();
    expect(screen.getByText("9 on the platform")).toBeOnTheScreen();
  });

  it("opens the people directory, and its back button returns to the admin home", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(url).includes("/people")
          ? { items: [], page: 1, perPage: 20, total: 0 }
          : { items: [] },
    }));
    const app = await openAdminHome();

    await user.press(screen.getByRole("button", { name: /People/ }));

    expect(app.getPathname()).toBe(routes.admin.people);
    expect(await screen.findByText("No one found")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(app.getPathname()).toBe(routes.admin.home);
  });

  it("shows zero waiting", async () => {
    respondWith([]);
    await openAdminHome();

    expect(await screen.findByText("0 waiting")).toBeOnTheScreen();
  });

  it("shows the row without a count while loading", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await openAdminHome();

    expect(screen.getByText("Join the school")).toBeOnTheScreen();
    expect(screen.queryByText(/waiting/)).toBeNull();
  });

  it("shows the row without a count after an error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ errors: [] }),
    });
    await openAdminHome();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByText("Join the school")).toBeOnTheScreen();
    expect(screen.queryByText(/waiting/)).toBeNull();
  });

  it("opens the tool, and its back button returns to the admin home", async () => {
    const user = userEvent.setup();
    respondWith([person("a")]);
    const app = await openAdminHome();
    await screen.findByText("1 waiting");

    await user.press(screen.getByRole("button", { name: /Join the school/ }));

    expect(app.getPathname()).toBe(routes.admin.registrations);
    expect(await screen.findByText("Person a")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(app.getPathname()).toBe(routes.admin.home);
    expect(await screen.findByText("1 waiting")).toBeOnTheScreen();
  });

  it("shows one less waiting after a decision, back on the home", async () => {
    const user = userEvent.setup();
    const items = [person("a"), person("b")];
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      if (init.method === "POST") {
        items.shift();
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: "a", status: "approved" }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ items: [...items] }),
      };
    });
    await openAdminHome();
    await screen.findByText("2 waiting");

    await user.press(screen.getByRole("button", { name: /Join the school/ }));
    await screen.findByText("Person a");
    await user.press(screen.getAllByRole("button", { name: "Approve" })[0]);
    await screen.findByText("Approved");
    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByText("1 waiting")).toBeOnTheScreen();
  });
});
