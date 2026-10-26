import { renderHook, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  createQueryWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "@/modules/cancellation-rules/cancellation-rules.test-utils";

import { useNoticeRecipientsCount } from "./use-notice-recipients-count.hook";

beforeEach(() => setupSignedInUser());

describe("useNoticeRecipientsCount", () => {
  it("reads the count of the audience from the backend", async () => {
    fetchMock.mockResolvedValue(ok({ count: 7 }));

    const { result } = await renderHook(() => useNoticeRecipientsCount("students"), {
      wrapper: createQueryWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.data).toEqual({ count: 7 }));
    expect(requestedPaths()).toEqual(["/notifications/broadcast/recipients?audience=students"]);
  });

  it("fails without retrying", async () => {
    fetchMock.mockResolvedValue(failure(500));

    const { result } = await renderHook(() => useNoticeRecipientsCount("all"), {
      wrapper: createQueryWrapper(createQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
