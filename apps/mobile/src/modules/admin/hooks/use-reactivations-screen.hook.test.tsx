import { act, renderHook, waitFor } from "@testing-library/react-native";

import { apiPost, SessionExpiredError } from "@/services/api";

import {
  CARLA,
  createQueryClient,
  createWrapper,
  fetchMock,
  respond,
  setupSignedInAdmin,
} from "../registrations.test-utils";

import { useReactivationsScreen } from "./use-reactivations-screen.hook";

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
  respond(200, { items: [CARLA] });
  const hook = await renderHook(() => useReactivationsScreen(), {
    wrapper: createWrapper(createQueryClient()),
  });
  await waitFor(() => expect(hook.result.current.requests).toEqual([CARLA]));

  return hook;
}

const posts = () =>
  fetchMock.mock.calls.filter(([, init]) => init.method === "POST");

describe("useReactivationsScreen", () => {
  it("sends one request when the same card is tapped twice in a row", async () => {
    const hook = await setup();
    respond(200, { id: "c", decision: "approved" });

    await act(async () => {
      hook.result.current.approve(CARLA);
      hook.result.current.approve(CARLA);
    });

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()).toHaveLength(1);
  });

  it("keeps the selected request while the detail sheet closes", async () => {
    const hook = await setup();

    await act(async () => hook.result.current.openRequest(CARLA));
    expect(hook.result.current.selected).toEqual(CARLA);
    expect(hook.result.current.isSheetVisible).toBe(true);

    await act(async () => hook.result.current.closeSheet());
    expect(hook.result.current.selected).toEqual(CARLA);
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

    await act(async () => {
      hook.result.current.approve(CARLA);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(apiPost).toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
  });
});
