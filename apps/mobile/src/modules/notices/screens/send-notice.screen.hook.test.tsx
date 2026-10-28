import { act, renderHook, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import {
  createQueryClient,
  createQueryWrapper,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/cancellation-rules/cancellation-rules.test-utils";

import { useSendNoticeScreen } from "./send-notice.screen.hook";

let mockParams: { classId?: string } = {};

jest.mock("@/providers/session", () => ({
  useSession: () => ({
    user: { id: "admin-1", role: "admin", status: "approved" },
  }),
}));

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  setupSignedInUser();
  fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
    init?.method === "POST" ? ok(undefined) : ok({ count: 3 }),
  );
});

const open = async () => {
  const { result } = await renderHook(() => useSendNoticeScreen(), {
    wrapper: createQueryWrapper(createQueryClient()),
  });
  await waitFor(() => expect(result.current.count).toBe(3));

  return result;
};

const posts = () =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");

describe("useSendNoticeScreen", () => {
  it("does not open the confirmation, nor send, while a field is blank", async () => {
    const result = await open();

    await act(async () => {
      result.current.askToConfirm();
      result.current.confirm();
    });

    expect(result.current.isConfirming).toBe(false);
    expect(posts()).toHaveLength(0);
  });

  it("sends once even when confirmed twice in the same frame", async () => {
    const result = await open();
    await act(async () => {
      result.current.setTitle("T");
      result.current.setMessage("M");
    });

    await act(async () => {
      result.current.askToConfirm();
    });
    expect(result.current.isConfirming).toBe(true);

    await act(async () => {
      result.current.confirm();
      result.current.confirm();
    });

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(posts()).toHaveLength(1);
  });

  it("keeps the confirmation open while a send is under way", async () => {
    let finish: (value: unknown) => void = () => undefined;
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? new Promise((resolve) => {
            finish = resolve;
          })
        : Promise.resolve(ok({ count: 3 })),
    );
    const result = await open();
    await act(async () => {
      result.current.setTitle("T");
      result.current.setMessage("M");
    });
    await act(async () => {
      result.current.askToConfirm();
    });
    await act(async () => {
      result.current.confirm();
    });

    expect(posts()).toHaveLength(1);
    await waitFor(() => expect(result.current.isSending).toBe(true));

    await act(async () => {
      result.current.closeConfirm();
    });

    expect(result.current.isConfirming).toBe(true);

    await act(async () => {
      finish(ok(undefined));
    });
    await waitFor(() => expect(result.current.isConfirming).toBe(false));
  });

  describe("in class mode", () => {
    const CLASS = {
      id: "c-1",
      discipline: "surf",
      level: "beginner",
      startsAt: "2030-01-15T11:00:00.000Z",
      endsAt: "2030-01-15T12:00:00.000Z",
      location: { id: "l-1", name: "Praia do Futuro" },
      instructors: [
        {
          id: "i-1",
          name: "Rui Costa",
          role: "instructor",
          whatsappNumber: null,
        },
      ],
      students: [],
      guests: [],
      pendingRequests: 0,
    };

    beforeEach(() => {
      jest.mocked(router.back).mockReset();
      mockParams = { classId: "c-1" };
      fetchMock.mockImplementation(async (url: string, init?: RequestInit) =>
        init?.method === "POST"
          ? ok(undefined)
          : ok(
              url.includes("/enrolments/pending")
                ? { total: 0, classes: [] }
                : CLASS,
            ),
      );
    });

    afterEach(() => {
      mockParams = {};
    });

    it("keeps the selected person while the person sheet closes", async () => {
      const { result } = await renderHook(() => useSendNoticeScreen(), {
        wrapper: createQueryWrapper(createQueryClient()),
      });
      await waitFor(() => expect(result.current.count).toBe(1));
      const person = {
        name: "Bia Lima",
        role: "student" as const,
        whatsappNumber: null,
      };

      expect(result.current.personVisible).toBe(false);

      await act(async () => result.current.openPerson(person));

      expect(result.current.personVisible).toBe(true);
      expect(result.current.selectedPerson).toEqual(person);

      await act(async () => result.current.closePerson());

      expect(result.current.personVisible).toBe(false);
      expect(result.current.selectedPerson).toEqual(person);
    });

    it("sends once to the class even when confirmed twice in the same frame", async () => {
      const { result } = await renderHook(() => useSendNoticeScreen(), {
        wrapper: createQueryWrapper(createQueryClient()),
      });
      await waitFor(() => expect(result.current.count).toBe(1));
      expect(result.current.isClassMode).toBe(true);
      await act(async () => {
        result.current.setTitle("T");
        result.current.setMessage("M");
      });
      await act(async () => {
        result.current.askToConfirm();
      });

      await act(async () => {
        result.current.confirm();
        result.current.confirm();
      });

      await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
      expect(posts()).toHaveLength(1);
      expect(String(posts()[0]![0])).toContain("/classes/c-1/message");
    });
  });
});
