import type { EnrolmentStatus, MyEnrolment } from "../enrolment.types";

import { BANNER_CLASSES, getEnrolmentDisplay, toChipTone } from "./enrolment-status";

const enrolment = (status: EnrolmentStatus): MyEnrolment => ({
  id: "e-1",
  status,
  requestedAt: "2026-10-14T13:00:00.000Z",
  reason: null,
});

describe("getEnrolmentDisplay", () => {
  it("draws a pending request of a class with free seats as pending", () => {
    expect(getEnrolmentDisplay(enrolment("pending"), false)).toEqual({
      key: "pending",
      tone: "warn",
      icon: "hourglass-outline",
    });
  });

  it("draws a pending request of a full class as on the waiting list", () => {
    expect(getEnrolmentDisplay(enrolment("pending"), true)).toEqual({
      key: "waitingList",
      tone: "info",
      icon: "list-outline",
    });
  });

  it.each([
    ["withdrawn", "withdrawn", "arrow-undo-outline"],
    ["expired", "expired", "time-outline"],
  ] as const)("draws a %s request as %s, full class or not", (status, key, icon) => {
    const expected = { key, tone: "dim", icon };

    expect(getEnrolmentDisplay(enrolment(status), false)).toEqual(expected);
    expect(getEnrolmentDisplay(enrolment(status), true)).toEqual(expected);
  });

  it.each(["approved", "denied", "cancelled", "takenOut", "classCancelled"] as const)(
    "draws nothing for %s yet",
    (status) => {
      expect(getEnrolmentDisplay(enrolment(status), false)).toBeNull();
    },
  );

  it("draws nothing without an enrolment", () => {
    expect(getEnrolmentDisplay(null, true)).toBeNull();
  });
});

describe("tones", () => {
  it("maps the dim tone to the muted chip and keeps the others", () => {
    expect([toChipTone("warn"), toChipTone("info"), toChipTone("dim")]).toEqual(["warn", "info", "muted"]);
  });

  it("has a banner background for each tone", () => {
    expect(BANNER_CLASSES).toEqual({ warn: "bg-warn-tint", info: "bg-info-tint", dim: "bg-dim" });
  });
});
