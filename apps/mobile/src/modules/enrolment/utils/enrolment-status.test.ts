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

  it("draws a taken-out student as taken out, full class or not", () => {
    const expected = { key: "takenOut", tone: "bad", icon: "remove-circle-outline" };

    expect(getEnrolmentDisplay(enrolment("takenOut"), false)).toEqual(expected);
    expect(getEnrolmentDisplay(enrolment("takenOut"), true)).toEqual(expected);
  });

  it.each([
    ["withdrawn", "withdrawn", "arrow-undo-outline"],
    ["expired", "expired", "time-outline"],
    ["cancelled", "cancelled", "remove-circle-outline"],
  ] as const)("draws a %s request as %s, full class or not", (status, key, icon) => {
    const expected = { key, tone: "dim", icon };

    expect(getEnrolmentDisplay(enrolment(status), false)).toEqual(expected);
    expect(getEnrolmentDisplay(enrolment(status), true)).toEqual(expected);
  });

  it.each([
    ["approved", "ok", "checkmark-circle-outline"],
    ["denied", "bad", "close-circle-outline"],
  ] as const)("draws a %s request with the %s tone, full class or not", (status, tone, icon) => {
    const expected = { key: status, tone, icon };

    expect(getEnrolmentDisplay(enrolment(status), false)).toEqual(expected);
    expect(getEnrolmentDisplay(enrolment(status), true)).toEqual(expected);
  });

  it("draws nothing for classCancelled yet", () => {
    expect(getEnrolmentDisplay(enrolment("classCancelled"), false)).toBeNull();
  });

  it("draws nothing without an enrolment", () => {
    expect(getEnrolmentDisplay(null, true)).toBeNull();
  });
});

describe("tones", () => {
  it("maps the dim tone to the muted chip and keeps the others", () => {
    expect([toChipTone("warn"), toChipTone("info"), toChipTone("dim"), toChipTone("ok"), toChipTone("bad")]).toEqual([
      "warn",
      "info",
      "muted",
      "ok",
      "bad",
    ]);
  });

  it("has a banner background for each tone", () => {
    expect(BANNER_CLASSES).toEqual({
      warn: "bg-warn-tint",
      info: "bg-info-tint",
      dim: "bg-dim",
      ok: "bg-ok-tint",
      bad: "bg-bad-tint",
    });
  });
});
