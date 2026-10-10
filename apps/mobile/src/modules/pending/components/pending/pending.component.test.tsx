import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import i18n from "@/i18n";
import { SessionContext } from "@/providers/session/session.context";
import type { SessionContextValue } from "@/providers/session/session.types";

import { Pending } from "./pending.component";

jest.mock("@/components/ui/button", () => {
  const actual = jest.requireActual("@/components/ui/button");

  return { ...actual, Button: jest.fn(actual.Button) };
});

const NOW = new Date("2026-10-10T15:00:00.000Z");

const user = {
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "pending",
  createdAt: new Date(NOW.getTime() - 30 * 1000).toISOString(),
};

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2026-10-10T15:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T15:00:00.000Z",
};

const clearSession = jest.fn();

const renderPending = (session: Partial<SessionContextValue> = {}) => {
  const value: SessionContextValue = {
    user,
    tokens,
    setSession: jest.fn(),
    clearSession,
    ...session,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <SessionContext.Provider value={value}>
        {children}
      </SessionContext.Provider>
    </QueryClientProvider>
  );

  return render(<Pending />, { wrapper });
};

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  clearSession.mockReset();
  globalThis.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

afterEach(() => {
  jest.useRealTimers();
});

describe("Pending", () => {
  it("shows the waiting content with the email", async () => {
    await renderPending();

    expect(
      screen.getByRole("header", { name: "Waiting for approval" }),
    ).toBeOnTheScreen();
    // The eyebrow and the first timeline row share the text.
    expect(screen.getAllByText("Account created")).toHaveLength(2);
    expect(screen.getByText("ana.silva@gmail.com")).toBeOnTheScreen();
    expect(screen.getByText("Team approval")).toBeOnTheScreen();
    expect(screen.getByText("Under review")).toBeOnTheScreen();
    expect(screen.getByText("Book classes")).toBeOnTheScreen();
    expect(screen.getByText("Now")).toBeOnTheScreen();
  });

  it.each([
    ["pt-BR", "Aguardando aprovação", "Terminar sessão", "Agora"],
    ["es-ES", "Esperando aprobación", "Cerrar sesión", "Ahora"],
  ])("shows the content in %s", async (locale, title, signOut, now) => {
    await i18n.changeLanguage(locale);
    await renderPending();

    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: signOut })).toBeOnTheScreen();
    expect(screen.getByText(now)).toBeOnTheScreen();
  });

  it("renders sign-out as a ghost button", async () => {
    await renderPending();

    // `Button` gives its ghost variant the `ds-text-button text-ink` label (covered by its own tests).
    expect(Button).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "ghost", children: "Sign out" }),
      undefined,
    );
  });

  it("has no back button", async () => {
    await renderPending();

    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeOnTheScreen();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("updates the created label every minute", async () => {
    await renderPending();
    expect(screen.getByText("Now")).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(screen.getByText("1 minute ago")).toBeOnTheScreen();
    expect(screen.queryByText("Now")).not.toBeOnTheScreen();
  });

  it("shows no time label when the date is invalid", async () => {
    await renderPending({ user: { ...user, createdAt: "not a date" } });

    expect(screen.queryByText("Now")).not.toBeOnTheScreen();
    expect(screen.getByText("Team approval")).toBeOnTheScreen();
  });

  it("renders without a user while a sign-out navigates away", async () => {
    await renderPending({ user: null, tokens: null });

    expect(
      screen.getByRole("header", { name: "Waiting for approval" }),
    ).toBeOnTheScreen();
  });

  it("signs out when Sign out is pressed", async () => {
    const press = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderPending();

    await press.press(screen.getByRole("button", { name: "Sign out" }));

    expect(clearSession).toHaveBeenCalledTimes(1);
  });
});
