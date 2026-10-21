import type { EnrolmentStatus, MyEnrolment } from "../enrolment.types";

import { getEnrolmentCta } from "./enrolment-cta";

const enrolment = (status: EnrolmentStatus): MyEnrolment => ({
  id: "e-1",
  status,
  requestedAt: "2026-10-14T13:00:00.000Z",
  reason: null,
});

describe("getEnrolmentCta", () => {
  it.each([
    [null, false, "request", "primary", "request"],
    [null, true, "joinWaitingList", "dark", "request"],
    ["pending", false, "withdraw", "outline", "withdraw"],
    ["pending", true, "leaveWaitingList", "ghost", "leaveWaitingList"],
    ["withdrawn", false, "requestAgain", "primary", "request"],
    ["withdrawn", true, "requestAgain", "dark", "request"],
    ["expired", false, "requestAgain", "primary", "request"],
    ["expired", true, "requestAgain", "dark", "request"],
    ["denied", false, "requestAgain", "primary", "request"],
    ["denied", true, "requestAgain", "dark", "request"],
    ["cancelled", false, "requestAgain", "primary", "request"],
    ["cancelled", true, "requestAgain", "dark", "request"],
    ["takenOut", false, "requestAgain", "primary", "request"],
    ["takenOut", true, "requestAgain", "dark", "request"],
  ] as const)("for %s on a class full=%s answers %s (%s)", (status, full, key, variant, action) => {
    expect(getEnrolmentCta(status === null ? null : enrolment(status), full)).toEqual({ key, variant, action });
  });

  it.each(["approved", "classCancelled"] as const)(
    "answers no button for %s",
    (status) => {
      expect(getEnrolmentCta(enrolment(status), false)).toBeNull();
      expect(getEnrolmentCta(enrolment(status), true)).toBeNull();
    },
  );
  it("offers to cancel an approved seat only while the deadline is ahead", () => {
    expect(getEnrolmentCta(enrolment("approved"), false, true)).toEqual({
      key: "cancelSeat",
      variant: "outline",
      action: "cancelSeat",
    });
    expect(getEnrolmentCta(enrolment("approved"), true, true)?.action).toBe("cancelSeat");
    expect(getEnrolmentCta(enrolment("approved"), false, false)).toBeNull();
  });

  it("never offers the cancellation for another status", () => {
    expect(getEnrolmentCta(enrolment("pending"), false, true)?.action).toBe("withdraw");
    expect(getEnrolmentCta(enrolment("takenOut"), false, true)?.action).toBe("request");
  });
});
