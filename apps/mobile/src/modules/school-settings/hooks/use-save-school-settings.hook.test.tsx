import { act, renderHook } from "@testing-library/react-native";

import { SCHOOL_SETTINGS_QUERY_KEY } from "@/hooks/use-school-settings.hook";
import {
  createQueryClient,
  createQueryWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/cancellation-rules/cancellation-rules.test-utils";

import { useSaveSchoolSettings } from "./use-save-school-settings.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

const save = async (
  variables: Parameters<
    ReturnType<typeof useSaveSchoolSettings>["mutateAsync"]
  >[0],
  queryClient = createQueryClient(),
) => {
  const { result } = await renderHook(() => useSaveSchoolSettings(), {
    wrapper: createQueryWrapper(queryClient),
  });

  await act(async () => {
    await result.current.mutateAsync(variables).catch(() => undefined);
  });
};

describe("useSaveSchoolSettings", () => {
  it("sends the switch, then the number, and caches the last answer", async () => {
    const queryClient = createQueryClient();
    fetchMock
      .mockResolvedValueOnce(
        ok({ whatsappNumber: null, waitingListEnabled: false }),
      )
      .mockResolvedValueOnce(
        ok({ whatsappNumber: "+351912345678", waitingListEnabled: false }),
      );

    await save(
      { waitingListEnabled: false, whatsappNumber: "+351912345678" },
      queryClient,
    );

    expect(fetchMock.mock.calls).toEqual([
      [
        "http://api.test/school-settings/waiting-list",
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer at-1",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled: false }),
        },
      ],
      [
        "http://api.test/school-settings/whatsapp",
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer at-1",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ whatsappNumber: "+351912345678" }),
        },
      ],
    ]);
    expect(queryClient.getQueryData(SCHOOL_SETTINGS_QUERY_KEY)).toEqual({
      whatsappNumber: "+351912345678",
      waitingListEnabled: false,
    });
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("sends nothing and keeps the cache when nothing changed", async () => {
    const queryClient = createQueryClient();

    await save({}, queryClient);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(SCHOOL_SETTINGS_QUERY_KEY)).toBeUndefined();
  });

  it("shows the generic toast on a failure and does not retry", async () => {
    fetchMock.mockResolvedValue(failure());

    await save({ waitingListEnabled: false });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
    );
  });

  it("shows the no-connection toast when the network is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await save({ whatsappNumber: "+351912345678" });

    expect(mockShow).toHaveBeenCalledWith(
      "No connection. Check your internet and try again.",
    );
  });

  it("shows nothing when the session expired", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ errors: ["auth.token.invalid"] }),
    });

    await save({ waitingListEnabled: true });

    expect(mockShow).not.toHaveBeenCalled();
  });
});
