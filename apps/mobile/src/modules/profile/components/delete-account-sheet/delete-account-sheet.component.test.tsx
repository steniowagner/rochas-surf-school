import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import type { SessionUser } from "@/navigation/resolve-flow.types";
import { getSession } from "@/services/session/session.store";

import {
  account,
  jsonResponse,
  renderWithProviders,
  seedSession,
  setupFetch,
} from "../../profile.test-utils";

import { DeleteAccountSheet } from "./delete-account-sheet.component";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  AlertMessageProvider: ({ children }: { children: unknown }) => children,
  useAlertMessage: () => ({ show: mockShow }),
}));
jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn() } }));

const fetchMock = setupFetch();

const COUNT_PATH = "/people?role=admin&perPage=1";
// The session provider reloads the account (`GET /auth/me`) when it mounts: only the count is counted.
const countCalls = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).endsWith(COUNT_PATH));
const deleteCalls = () =>
  fetchMock.mock.calls.filter(([, init]) => (init as { method?: string } | undefined)?.method === "DELETE");

/** Answers the account reload with `me`, the admins count with `total`, and `DELETE /auth/me` with `deleteStatus`. */
const serve = (me: SessionUser, total: number, deleteStatus = 204, deleteErrors: string[] = []) =>
  fetchMock.mockImplementation(async (url: string, init?: { method?: string }) => {
    if (init?.method === "DELETE") {
      return deleteStatus === 204
        ? ({ ok: true, status: 204, json: async () => undefined } as Response)
        : jsonResponse(deleteStatus, { errors: deleteErrors });
    }
    return String(url).endsWith(COUNT_PATH)
      ? jsonResponse(200, { items: [], page: 1, perPage: 1, total })
      : jsonResponse(200, me);
  });

/** Signs in `me` and serves the requests as `serve` does. */
const signIn = (me: SessionUser, total: number, deleteStatus?: number, deleteErrors?: string[]) => {
  seedSession(me);
  serve(me, total, deleteStatus, deleteErrors);
};

const renderSheet = async (onClose = jest.fn()) => {
  await renderWithProviders(<DeleteAccountSheet visible onClose={onClose} />);
  return onClose;
};

const NORMAL_TITLE = "Remove your account?";
const ONLY_ADMIN_TITLE = "Not yet";

describe("DeleteAccountSheet", () => {
  beforeEach(() => {
    mockShow.mockReset();
    jest.mocked(router.push).mockReset();
  });

  it("stops the only admin: Not yet, with Go to People and Cancel", async () => {
    signIn(account({ role: "admin" }), 1);
    const user = userEvent.setup();
    const onClose = await renderSheet();

    expect(await screen.findByText(ONLY_ADMIN_TITLE)).toBeOnTheScreen();
    expect(
      screen.getByText(
        "You're the school's only admin. Make someone else an admin before removing your account.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Remove account" })).not.toBeOnTheScreen();
    expect(countCalls()).toHaveLength(1);

    await user.press(screen.getByRole("button", { name: "Go to People" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith(routes.admin.people);
  });

  it("shows the normal confirmation to an admin when another admin remains", async () => {
    signIn(account({ role: "admin" }), 2);
    await renderSheet();

    await waitFor(() => expect(countCalls()).toHaveLength(1));
    expect(screen.getByText(NORMAL_TITLE)).toBeOnTheScreen();
    expect(screen.queryByText(ONLY_ADMIN_TITLE)).not.toBeOnTheScreen();
  });

  it.each(["student", "instructor"])("asks nothing for a %s and shows the normal confirmation", async (role) => {
    signIn(account({ role }), 1);
    await renderSheet();

    expect(await screen.findByText(NORMAL_TITLE)).toBeOnTheScreen();
    expect(countCalls()).toHaveLength(0);
  });

  it("shows the normal confirmation while the count loads", async () => {
    const me = account({ role: "admin" });
    seedSession(me);
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith(COUNT_PATH) ? new Promise(() => {}) : jsonResponse(200, me),
    );
    await renderSheet();

    await waitFor(() => expect(countCalls()).toHaveLength(1));
    expect(screen.getByText(NORMAL_TITLE)).toBeOnTheScreen();
  });

  it("shows the normal confirmation when the count fails, without retrying", async () => {
    const me = account({ role: "admin" });
    seedSession(me);
    fetchMock.mockImplementation(async (url: string) =>
      String(url).endsWith(COUNT_PATH) ? jsonResponse(500, { errors: [] }) : jsonResponse(200, me),
    );
    await renderSheet();

    await waitFor(() => expect(countCalls()).toHaveLength(1));
    expect(screen.getByText(NORMAL_TITLE)).toBeOnTheScreen();
    expect(countCalls()).toHaveLength(1);
  });

  it("switches to Not yet when the backend refuses the only admin, keeping them signed in", async () => {
    signIn(account({ role: "admin" }), 2, 409, ["user.role.lastAdmin"]);
    const user = userEvent.setup();
    const onClose = await renderSheet();
    await waitFor(() => expect(countCalls()).toHaveLength(1));

    await user.press(screen.getByRole("button", { name: "Remove account" }));

    expect(await screen.findByText(ONLY_ADMIN_TITLE)).toBeOnTheScreen();
    expect(getSession()).not.toBeNull();
    expect(mockShow).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await user.press(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText(NORMAL_TITLE)).toBeOnTheScreen();
  });

  it("closes the account and the sheet on confirm", async () => {
    signIn(account(), 1);
    const user = userEvent.setup();
    const onClose = await renderSheet();

    await user.press(await screen.findByRole("button", { name: "Remove account" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(deleteCalls()).toHaveLength(1);
  });
});
