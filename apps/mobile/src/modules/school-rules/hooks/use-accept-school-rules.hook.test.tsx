import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import { useSchoolRules } from "@/modules/school-rules/hooks/use-school-rules.hook";
import { SessionProvider, useSession } from "@/providers/session";

import { useAcceptSchoolRules } from "./use-accept-school-rules.hook";

const fetchMock = jest.fn();
const mockShow = jest.fn();
const onOutdated = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const user = {
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "approved",
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber: "+5585999998888",
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
};

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <SessionProvider>{children}</SessionProvider>
  </QueryClientProvider>
);

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

const renderSignedIn = async () => {
  const hook = await renderHook(
    () => ({
      session: useSession(),
      rules: useSchoolRules(),
      accept: useAcceptSchoolRules({ onOutdated }),
    }),
    { wrapper },
  );

  await act(async () =>
    hook.result.current.session.setSession({ user, tokens }),
  );

  return hook;
};

const accept = async (hook: Awaited<ReturnType<typeof renderSignedIn>>) => {
  await act(async () => {
    await hook.result.current.accept
      .mutateAsync({ version: 3 })
      .catch(() => {});
    // React Query notifies its observers on a timer.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const acceptCalls = () =>
  fetchMock.mock.calls.filter(([url]) => url.endsWith("/acceptances"));

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  fetchMock.mockReset();
  mockShow.mockReset();
  onOutdated.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("useAcceptSchoolRules", () => {
  it("puts the account in the session", async () => {
    const accepted = { ...user, rulesAccepted: true };
    respond(200, accepted);
    const hook = await renderSignedIn();

    await accept(hook);

    expect(hook.result.current.session.user).toEqual(accepted);
    expect(hook.result.current.session.tokens).toEqual(tokens);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("sends the version and the token", async () => {
    respond(200, user);
    const hook = await renderSignedIn();

    await accept(hook);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/school-rules/acceptances",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer at-1",
        },
        body: JSON.stringify({ version: 3 }),
      },
    );
  });

  it("does not update the session without tokens", async () => {
    respond(200, user);
    const hook = await renderHook(
      () => ({ session: useSession(), accept: useAcceptSchoolRules() }),
      { wrapper },
    );

    await act(async () => {
      await hook.result.current.accept.mutateAsync({ version: 3 });
    });

    expect(hook.result.current.session.user).toBeNull();
  });

  it("outdated: refetches the rules and shows the toast", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/acceptances")
        ? {
            ok: false,
            status: 409,
            json: async () => ({
              errors: ["schoolRules.version.outdated"],
              details: { currentVersion: 4 },
            }),
          }
        : {
            ok: true,
            status: 200,
            json: async () => ({ version: 4, rules: [] }),
          },
    );
    const hook = await renderSignedIn();
    await waitFor(() => expect(hook.result.current.rules.isSuccess).toBe(true));
    fetchMock.mockClear();

    await accept(hook);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://api.test/school-rules",
        expect.objectContaining({ method: "GET" }),
      ),
    );
    expect(mockShow).toHaveBeenCalledWith(
      "The rules changed. Read them again and accept.",
    );
    expect(onOutdated).toHaveBeenCalledTimes(1);
    expect(hook.result.current.session.user).toEqual(user);
  });

  it("error: signs out on 401", async () => {
    respond(401, { errors: ["auth.token.invalid"] });
    const hook = await renderSignedIn();

    await accept(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "Your session expired. Sign in again.",
    );
    expect(hook.result.current.session.user).toBeNull();
    expect(hook.result.current.session.tokens).toBeNull();
  });

  it("error: shows no connection", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    const hook = await renderSignedIn();

    await accept(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "No connection. Check your internet and try again.",
    );
    expect(hook.result.current.session.user).toEqual(user);
    expect(onOutdated).not.toHaveBeenCalled();
  });

  it.each([
    ["403", 403, { errors: ["user.status.notApproved"] }],
    ["422", 422, { errors: ["schoolRules.version.integer"] }],
    ["500", 500, { errors: [] }],
    ["a non-JSON body", 500, undefined],
  ])("error: shows the generic message on %s", async (_name, status, body) => {
    fetchMock.mockResolvedValue({
      ok: false,
      status,
      json: async () => {
        if (body === undefined) {
          throw new Error("not json");
        }

        return body;
      },
    });
    const hook = await renderSignedIn();

    await accept(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
    );
    expect(hook.result.current.session.user).toEqual(user);
    expect(acceptCalls()).toHaveLength(1);
  });

  it("error: shows the generic message for an unexpected error", async () => {
    fetchMock.mockResolvedValue(undefined);
    const hook = await renderSignedIn();

    await accept(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
    );
    expect(hook.result.current.session.user).toEqual(user);
  });
});
