import { act, renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";
import { ApiError, SessionExpiredError } from "@/services/api";

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
  it("sends a second confirm press on the same request only once", async () => {
    let release!: () => void;
    mockApprove.mockReturnValue(new Promise<void>((resolve) => (release = resolve)));
    const { result } = await setup();

    await act(async () => result.current.openApprove(REQUEST));
    await act(async () => {
      result.current.confirmApprove();
      result.current.confirmApprove();
    });

    expect(mockApprove).toHaveBeenCalledTimes(1);
    expect(result.current.sending).toEqual({ "r-1": "approve" });
    // The sheet stays open while it sends, and the card being sent can't open another one.
    expect(result.current.approving).toEqual(REQUEST);
    await act(async () => result.current.closeApprove());
    await act(async () => result.current.openApprove(REQUEST));
    expect(result.current.approving).toBeNull();

    await act(async () => release());
    expect(result.current.sending).toEqual({});
  });

  it("opens the confirmation sheet with the request and sends nothing", async () => {
    const { result } = await setup();

    await act(async () => result.current.openApprove(REQUEST));

    expect(result.current.approving).toEqual(REQUEST);
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it("clears the confirmation sheet on cancel, sending nothing", async () => {
    const { result } = await setup();

    await act(async () => result.current.openApprove(REQUEST));
    await act(async () => result.current.closeApprove());

    expect(result.current.approving).toBeNull();
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it("closes the confirmation sheet and shows the success alert once confirmed", async () => {
    mockApprove.mockResolvedValue({});
    const { result } = await setup();

    await act(async () => result.current.openApprove(REQUEST));
    await act(async () => result.current.confirmApprove());

    await waitFor(() => expect(result.current.approving).toBeNull());
    expect(mockShow).toHaveBeenCalledWith("Ana Souza enrolled · student notified", {
      tone: "success",
    });
  });

  it("closes the confirmation sheet and reloads when confirm finds the request stale", async () => {
    mockApprove.mockRejectedValue(new ApiError(409, ["enrolment.notPending"]));
    const { result } = await setup();
    const calls = fetchMock.mock.calls.length;

    await act(async () => result.current.openApprove(REQUEST));
    await act(async () => result.current.confirmApprove());

    await waitFor(() => expect(result.current.approving).toBeNull());
    expect(mockShow).toHaveBeenCalledWith("This request was already decided.");
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(calls));
  });

  it("keeps the confirmation sheet open when confirm fails otherwise", async () => {
    mockApprove.mockRejectedValue(new ApiError(500, ["INTERNAL_SERVER_ERROR"]));
    const { result } = await setup();

    await act(async () => result.current.openApprove(REQUEST));
    await act(async () => result.current.confirmApprove());

    await waitFor(() => expect(mockShow).toHaveBeenCalled());
    expect(result.current.approving).toEqual(REQUEST);
    expect(result.current.sending).toEqual({});
  });

  it("sends nothing when an enrolment is confirmed with no sheet open", async () => {
    const { result } = await setup();

    await act(async () => result.current.confirmApprove());

    expect(mockApprove).not.toHaveBeenCalled();
  });

  it("shows no toast when the session expired", async () => {
    mockApprove.mockRejectedValue(new SessionExpiredError());
    const { result } = await setup();

    await act(async () => result.current.openApprove(REQUEST));
    await act(async () => {
      result.current.confirmApprove();
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
