import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";
import { SessionExpiredError } from "@/services/api";

import { useClassRequestsScreen } from "./use-class-requests-screen.hook";

const mockShow = jest.fn();
const mockApprove = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

jest.mock("./use-approve-request.hook", () => ({
  useApproveRequest: () => ({ mutateAsync: mockApprove }),
}));

const REQUEST = {
  id: "r-1",
  requestedAt: "2026-10-19T12:12:00.000Z",
  student: { id: "s-1", name: "Ana Souza", photoUrl: null },
};

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
  mockApprove.mockReset();
  fetchMock.mockResolvedValue(ok({ total: 0, classes: [] }));
});

async function setup() {
  const view = await renderHook(() => useClassRequestsScreen(), {
    wrapper: createWrapper(createQueryClient()),
  });
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));

  return view;
}

describe("useClassRequestsScreen", () => {
  it("sends a second press on the same request only once", async () => {
    let release!: () => void;
    mockApprove.mockReturnValue(new Promise<void>((resolve) => (release = resolve)));
    const { result } = await setup();

    await act(async () => {
      void result.current.approve(REQUEST);
      void result.current.approve(REQUEST);
    });

    expect(mockApprove).toHaveBeenCalledTimes(1);
    expect(result.current.sending).toEqual({ "r-1": "approve" });

    await act(async () => release());
    expect(result.current.sending).toEqual({});
  });

  it("shows no toast when the session expired", async () => {
    mockApprove.mockRejectedValue(new SessionExpiredError());
    const { result } = await setup();

    await act(async () => {
      await result.current.approve(REQUEST);
    });

    expect(mockShow).not.toHaveBeenCalled();
  });

  it("sends nothing when a denial is confirmed with no sheet open", async () => {
    const { result } = await setup();
    const calls = fetchMock.mock.calls.length;

    await act(async () => result.current.confirmDeny("reason"));

    expect(fetchMock).toHaveBeenCalledTimes(calls);
  });

  it("opens and closes the deny sheet", async () => {
    const { result } = await setup();

    await act(async () => result.current.openDeny(REQUEST));
    expect(result.current.denying).toEqual(REQUEST);

    await act(async () => result.current.closeDeny());
    expect(result.current.denying).toBeNull();
  });
});
