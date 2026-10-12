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
  it("sends one request when the same card is tapped twice in a row", async () => {
    const hook = await setup();
    respond(200, { id: "a", status: "approved" });

    await act(async () => {
      hook.result.current.approve(ANA);
      hook.result.current.approve(ANA);
    });

    await waitFor(() => expect(hook.result.current.decided).toHaveLength(1));
    expect(posts()).toHaveLength(1);
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

    await act(async () => {
      hook.result.current.approve(ANA);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(apiPost).toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
    expect(hook.result.current.decided).toEqual([]);
  });
});
