import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { ClassItem } from "@/modules/classes/classes.types";
import {
  createQueryClient,
  createWrapper,
  fetchMock,
  setupSignedInUser,
} from "@/modules/classes/classes.test-utils";

import { useClassEnrolment } from "./use-class-enrolment.hook";

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: jest.fn() }),
}));

beforeEach(setupSignedInUser);

const item = (myEnrolment: ClassItem["myEnrolment"]) =>
  ({ id: "c-1", seatsTaken: 0, capacity: 8, myEnrolment }) as ClassItem;

const setup = (props: { item: ClassItem | undefined; canEnrol?: boolean }) =>
  renderHook(
    () =>
      useClassEnrolment({
        item: props.item,
        state: "not-started",
        canEnrol: props.canEnrol ?? true,
        reload: jest.fn(),
      }),
    { wrapper: createWrapper(createQueryClient()) },
  );

describe("useClassEnrolment", () => {
  it("has no button, banner or invitation when the class is not loaded or the viewer cannot enrol", async () => {
    const loading = await setup({ item: undefined });
    const blocked = await setup({ item: item(null), canEnrol: false });

    for (const { result } of [loading, blocked]) {
      expect(result.current.cta).toBeNull();
      expect(result.current.display).toBeNull();
      expect(result.current.invitesWaitingList).toBe(false);
    }
  });

  it("does nothing when the button is pressed without one", async () => {
    const { result } = await setup({ item: item({ id: "e-1", status: "approved", requestedAt: "2026-10-13T10:00:00.000Z" }) });

    await act(async () => result.current.pressCta());

    expect(result.current.requestVisible).toBe(false);
    expect(result.current.withdrawVisible).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends no withdrawal when there is no enrolment to withdraw", async () => {
    const { result } = await setup({ item: item(null) });

    await act(async () => result.current.withdraw());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the button as loading while it leaves the waiting list, without opening a sheet", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const full = { ...item({ id: "e-1", status: "pending" } as ClassItem["myEnrolment"]), seatsTaken: 8 };
    const { result } = await setup({ item: full });

    expect(result.current.ctaLoading).toBe(false);

    await act(async () => result.current.pressCta());

    await waitFor(() => expect(result.current.ctaLoading).toBe(true));
    expect(result.current.withdrawVisible).toBe(false);
  });
});
