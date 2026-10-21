import { act, renderHook } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import * as api from "@/services/api";

import { useTakeGuestOut } from "./use-take-guest-out.hook";

const mockShow = jest.fn();

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiDelete: jest.fn(actual.apiDelete) };
});

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const TARGET = { name: "Carolina Reis", guestId: "g-1" };

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

async function setup() {
  const reload = jest.fn();
  const view = await renderHook(() => useTakeGuestOut(reload), {
    wrapper: createWrapper(createQueryClient()),
  });

  return { ...view, reload };
}

describe("useTakeGuestOut", () => {
  it("opens and closes for a guest", async () => {
    const { result } = await setup();

    expect(result.current.target).toBeNull();
    await act(async () => result.current.open(TARGET));
    expect(result.current.target).toEqual(TARGET);
    await act(async () => result.current.close());
    expect(result.current.target).toBeNull();
  });

  it("does nothing when confirmed with no guest", async () => {
    const { result } = await setup();

    await act(async () => result.current.confirm());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes the guest, tells the admin and closes", async () => {
    fetchMock.mockResolvedValue(ok(undefined));
    const { result, reload } = await setup();
    await act(async () => result.current.open(TARGET));

    await act(async () => result.current.confirm());

    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/guests/g-1");
    expect(mockShow).toHaveBeenCalledWith("Carolina Reis taken out");
    expect(result.current.target).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it("closes and reloads the class when the guest is gone or the class started, with its toast", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({ errors: ["guest.notFound"] }) });
    const { result, reload } = await setup();
    await act(async () => result.current.open(TARGET));

    await act(async () => result.current.confirm());

    expect(mockShow).toHaveBeenCalledWith("This guest is no longer in the class.");
    expect(result.current.target).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("keeps the guest open on any other failure", async () => {
    fetchMock.mockResolvedValue(failure(500));
    const { result, reload } = await setup();
    await act(async () => result.current.open(TARGET));

    await act(async () => result.current.confirm());

    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(result.current.target).toEqual(TARGET);
    expect(reload).not.toHaveBeenCalled();
  });

  it("shows nothing for an expired session, which the session flow handles", async () => {
    const { result } = await setup();
    await act(async () => result.current.open(TARGET));
    jest.mocked(api.apiDelete).mockRejectedValueOnce(new api.SessionExpiredError());

    await act(async () => result.current.confirm());

    expect(mockShow).not.toHaveBeenCalled();
    expect(result.current.target).toEqual(TARGET);
  });
});
