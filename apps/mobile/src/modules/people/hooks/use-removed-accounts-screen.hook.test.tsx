import { act, renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import { SessionProvider } from "@/providers/session";

import {
  createQueryClient,
  createWrapper,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInAdmin,
} from "../people.test-utils";

import { useRemovedAccountsScreen } from "./use-removed-accounts-screen.hook";

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: jest.fn() }),
}));

const BIA = {
  id: "r-1",
  name: "Bia Souza",
  role: "student" as const,
  photoUrl: null,
  whatsappNumber: null,
  removedAt: "2026-10-02T15:00:00.000Z",
};

function setup() {
  const Query = createWrapper(createQueryClient());

  return renderHook(() => useRemovedAccountsScreen(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <SessionProvider>
        <Query>{children}</Query>
      </SessionProvider>
    ),
  });
}

beforeEach(() => {
  setupSignedInAdmin();
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
    init?.method === "POST"
      ? ok({ id: "r-1", status: "approved" })
      : ok({ items: [BIA] }),
  );
});

describe("useRemovedAccountsScreen", () => {
  it("sends one restore when the confirmation sheet is confirmed twice in the same frame", async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.accounts).toHaveLength(1));

    await act(async () =>
      result.current.openRestore(result.current.accounts[0]!),
    );
    await act(async () => {
      result.current.confirmRestore();
      result.current.confirmRestore();
    });

    await waitFor(() => expect(result.current.restoreCandidate).toBeNull());
    expect(
      requestedPaths().filter((path) => path === "/people/r-1/restore"),
    ).toHaveLength(1);
  });

  it("sends nothing when a restore is confirmed with no sheet open", async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.accounts).toHaveLength(1));

    await act(async () => result.current.confirmRestore());

    expect(
      requestedPaths().filter((path) => path.endsWith("/restore")),
    ).toHaveLength(0);
  });

  it("opens no confirmation sheet while a restore runs", async () => {
    let answer!: (value: unknown) => void;
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? new Promise((resolve) => (answer = resolve))
        : Promise.resolve(ok({ items: [BIA] })),
    );
    const { result } = await setup();
    await waitFor(() => expect(result.current.accounts).toHaveLength(1));

    await act(async () => result.current.openRestore(BIA));
    await act(async () => result.current.confirmRestore());
    await act(async () => result.current.closeRestore());
    await act(async () => result.current.openRestore(BIA));

    expect(result.current.restoreCandidate).toBeNull();

    await act(async () => answer(ok({ id: "r-1", status: "approved" })));
    expect(result.current.restoringId).toBeNull();
  });
});
