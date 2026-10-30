import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import { ReactNode } from "react";

import { SessionProvider, useSession } from "@/providers/session";

import { useSaveWhatsapp } from "./use-save-whatsapp.hook";

const fetchMock = jest.fn();
const mockShow = jest.fn();

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
  photoUrl: null,
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
  denialReason: null,
  reactivationStatus: null,
};

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

const variables = { whatsappNumber: "+5585999998888", whatsappVisible: false };

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
    () => ({ session: useSession(), save: useSaveWhatsapp() }),
    { wrapper },
  );

  await act(async () =>
    hook.result.current.session.setSession({ user, tokens }),
  );

  return hook;
};

const save = async (hook: Awaited<ReturnType<typeof renderSignedIn>>) => {
  await act(async () => {
    await hook.result.current.save.mutateAsync(variables).catch(() => {});
    // React Query notifies its observers on a timer.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { gcTime: Infinity } },
  });
  fetchMock.mockReset();
  mockShow.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("useSaveWhatsapp", () => {
  it("puts the number with the access token and updates the session user", async () => {
    const saved = { ...user, whatsappNumber: "+5585999998888" };
    respond(200, saved);
    const hook = await renderSignedIn();

    await save(hook);

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/auth/me/whatsapp", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer at-1",
      },
      body: JSON.stringify(variables),
    });
    expect(hook.result.current.session.user).toEqual(saved);
    expect(hook.result.current.session.tokens).toEqual(tokens);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("does not retry a failure", async () => {
    respond(500, { errors: [] });
    const hook = await renderSignedIn();

    await save(hook);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["user.whatsappNumber.phone", 422, "Invalid WhatsApp number."],
    ["user.whatsappNumber.required", 422, "Invalid WhatsApp number."],
    ["user.status.notApproved", 403, "Something went wrong. Please try again."],
  ])("shows %s in the toast", async (errorCode, status, message) => {
    respond(status, { errors: [errorCode] });
    const hook = await renderSignedIn();

    await save(hook);

    expect(mockShow).toHaveBeenCalledWith(message);
    expect(hook.result.current.session.user).toEqual(user);
  });

  it("shows the no-connection message when the request fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    const hook = await renderSignedIn();

    await save(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "No connection. Check your internet and try again.",
    );
    expect(hook.result.current.session.user).toEqual(user);
  });

  it("shows the generic message for an error without a code", async () => {
    respond(500, {});
    const hook = await renderSignedIn();

    await save(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
    );
  });

  it("shows the generic message for an unexpected error", async () => {
    fetchMock.mockResolvedValue(undefined);
    const hook = await renderSignedIn();

    await save(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
    );
  });

  it("shows nothing more when the session expired", async () => {
    respond(401, { errors: ["auth.token.invalid"] });
    const hook = await renderSignedIn();

    await save(hook);

    // The session is cleared and the message shown once, for the whole app, by useSessionExpired.
    expect(mockShow).not.toHaveBeenCalled();
    expect(hook.result.current.session.user).toBeNull();
    expect(hook.result.current.session.tokens).toBeNull();
  });

  it("does not update the session without tokens", async () => {
    respond(200, user);
    const hook = await renderHook(
      () => ({ session: useSession(), save: useSaveWhatsapp() }),
      {
        wrapper,
      },
    );

    await save(hook as never);

    expect(hook.result.current.session.user).toBeNull();
  });
});
