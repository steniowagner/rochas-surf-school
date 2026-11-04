import { act, renderHook, waitFor } from "@testing-library/react-native";

import { apiPost, SessionExpiredError } from "@/services/api";

import {
  ANA,
  createQueryClient,
  createWrapper,
  fetchMock,
  respond,
  setupSignedInAdmin,
} from "../registrations.test-utils";

import { useRegistrationsScreen } from "./use-registrations-screen.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiPost: jest.fn(actual.apiPost) };
});

beforeEach(() => {
  setupSignedInAdmin();
  mockShow.mockReset();
});

async function setup() {
  respond(200, { items: [ANA] });
  const hook = await renderHook(() => useRegistrationsScreen(), {
    wrapper: createWrapper(createQueryClient()),
  });
  await waitFor(() => expect(hook.result.current.registrations).toEqual([ANA]));

  return hook;
}

const posts = () =>
  fetchMock.mock.calls.filter(([, init]) => init.method === "POST");

describe("useRegistrationsScreen", () => {
  it("sends one request when the confirmation sheet is confirmed twice in a row", async () => {
    const hook = await setup();
    respond(200, { id: "a", status: "approved" });

    await act(async () => hook.result.current.openApprove(ANA));
    await act(async () => {
      hook.result.current.confirmApprove();
      hook.result.current.confirmApprove();
    });

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()).toHaveLength(1);
  });

  it("opens the confirmation sheet with the registration and sends nothing", async () => {
    const hook = await setup();

    await act(async () => hook.result.current.openApprove(ANA));

    expect(hook.result.current.approving).toEqual(ANA);
    expect(posts()).toHaveLength(0);
  });

  it("does not open the confirmation sheet of a card being sent", async () => {
    const hook = await setup();
    let release!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    await act(async () => hook.result.current.openApprove(ANA));
    await act(async () => hook.result.current.confirmApprove());
    await act(async () => hook.result.current.closeApprove());
    await act(async () => hook.result.current.openApprove(ANA));

    expect(hook.result.current.approving).toBeNull();

    await act(async () => {
      release({
        ok: true,
        status: 200,
        json: async () => ({ id: "a", status: "approved" }),
      });
    });
  });

  it("clears the confirmation sheet on cancel, sending nothing", async () => {
    const hook = await setup();

    await act(async () => hook.result.current.openApprove(ANA));
    await act(async () => hook.result.current.closeApprove());

    expect(hook.result.current.approving).toBeNull();
    expect(posts()).toHaveLength(0);
  });

  it("closes the confirmation sheet once confirmed and sent", async () => {
    const hook = await setup();
    respond(200, { id: "a", status: "approved" });

    await act(async () => hook.result.current.openApprove(ANA));
    await act(async () => hook.result.current.confirmApprove());

    await waitFor(() => expect(hook.result.current.approving).toBeNull());
    expect(posts()).toHaveLength(1);
  });

  it("closes the confirmation sheet when confirm finds it already decided", async () => {
    const hook = await setup();
    respond(409, { errors: ["registration.status.notPending"] });

    await act(async () => hook.result.current.openApprove(ANA));
    await act(async () => hook.result.current.confirmApprove());

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith(
        "This registration was already decided.",
      ),
    );
    expect(hook.result.current.approving).toBeNull();
  });

  it("keeps the confirmation sheet open when confirm fails otherwise", async () => {
    const hook = await setup();
    respond(500, { errors: ["INTERNAL_SERVER_ERROR"] });

    await act(async () => hook.result.current.openApprove(ANA));
    await act(async () => hook.result.current.confirmApprove());

    await waitFor(() => expect(mockShow).toHaveBeenCalled());
    expect(hook.result.current.approving).toEqual(ANA);
    expect(hook.result.current.sending).toEqual({});
  });

  it("sends nothing when an approval is confirmed with no sheet open", async () => {
    const hook = await setup();

    await act(async () => {
      hook.result.current.confirmApprove();
    });

    expect(posts()).toHaveLength(0);
  });

  it("keeps the selected registration while the detail sheet closes", async () => {
    const hook = await setup();

    await act(async () => hook.result.current.openRegistration(ANA));
    expect(hook.result.current.selected).toEqual(ANA);
    expect(hook.result.current.isSheetVisible).toBe(true);

    await act(async () => hook.result.current.closeSheet());
    expect(hook.result.current.selected).toEqual(ANA);
    expect(hook.result.current.isSheetVisible).toBe(false);
  });

  it("sends nothing when a denial is confirmed with no sheet open", async () => {
    const hook = await setup();

    await act(async () => {
      hook.result.current.confirmDeny("reason");
    });

    expect(posts()).toHaveLength(0);
  });

  it("shows no toast when the session expired", async () => {
    const hook = await setup();
    jest.mocked(apiPost).mockRejectedValueOnce(new SessionExpiredError());

    await act(async () => hook.result.current.openApprove(ANA));
    await act(async () => {
      hook.result.current.confirmApprove();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(apiPost).toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
  });
});
