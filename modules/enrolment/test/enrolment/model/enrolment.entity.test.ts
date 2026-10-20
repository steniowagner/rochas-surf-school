import { DomainError, ValidationException } from "@rochas-surf-school/shared";
import {
  ENROLMENT_REASON_MAX,
  ENROLMENT_STATUSES,
  Enrolment,
  EnrolmentState,
  EnrolmentStatus,
  OPEN_ENROLMENT_STATUSES,
} from "../../../src";

const CLASS_ID = "3b5c7d9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f";
const STUDENT_ID = "5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25";
const REQUESTED = new Date("2026-10-18T12:00:00.000Z");
const NOW = new Date("2026-10-19T09:00:00.000Z");

function build(overrides: Partial<EnrolmentState> = {}): Enrolment {
  return new Enrolment({
    classId: CLASS_ID,
    studentId: STUDENT_ID,
    status: "pending",
    requestedAt: REQUESTED,
    ...overrides,
  });
}

function errorsOf(action: () => void): string[] {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationException);
    return (error as ValidationException).errors.map((item) => item.message);
  }
  throw new Error("expected a ValidationException");
}

describe("Enrolment", () => {
  it("defaults the optional fields to null and copies the dates", () => {
    const enrolment = build();

    expect(enrolment.ruleAcceptedAt).toBeNull();
    expect(enrolment.decidedAt).toBeNull();
    expect(enrolment.reason).toBeNull();
    expect(enrolment.endedAt).toBeNull();
    expect(enrolment.requestedAt).toEqual(REQUESTED);
    expect(enrolment.requestedAt).not.toBe(REQUESTED);
    expect(() => enrolment.validate()).not.toThrow();
  });

  it("keeps the stored optional fields", () => {
    const enrolment = build({
      status: "denied",
      ruleAcceptedAt: REQUESTED,
      decidedAt: NOW,
      reason: "Sem vaga",
      endedAt: NOW,
    });

    expect(enrolment.ruleAcceptedAt).toEqual(REQUESTED);
    expect(enrolment.decidedAt).toEqual(NOW);
    expect(enrolment.reason).toBe("Sem vaga");
    expect(enrolment.endedAt).toEqual(NOW);
    expect(() => enrolment.validate()).not.toThrow();
  });

  it("knows the product statuses and which of them are open", () => {
    expect(ENROLMENT_STATUSES).toEqual([
      "pending",
      "approved",
      "denied",
      "withdrawn",
      "expired",
      "cancelled",
      "takenOut",
      "classCancelled",
    ]);
    expect(ENROLMENT_STATUSES.filter((status) => build({ status }).isOpen)).toEqual(
      OPEN_ENROLMENT_STATUSES,
    );
  });

  it.each([
    [{ classId: "" }, ["enrolment.classId.required"]],
    [{ classId: "nope" }, ["enrolment.classId.uuid"]],
    [{ studentId: "" }, ["enrolment.studentId.required"]],
    [{ studentId: "nope" }, ["enrolment.studentId.uuid"]],
    [{ status: "gone" as EnrolmentStatus }, ["enrolment.status.in"]],
    [{ reason: "a".repeat(ENROLMENT_REASON_MAX + 1) }, ["enrolment.reason.max.length"]],
  ])("refuses %j", (state, keys) => {
    expect(errorsOf(() => build(state).validate())).toEqual(keys);
  });

  describe("approve", () => {
    it("approves a pending request and stamps the decision", () => {
      const out = build().approve(NOW);

      expect(out.status).toBe("approved");
      expect(out.decidedAt).toEqual(NOW);
      expect(out.reason).toBeNull();
      expect(out.endedAt).toBeNull();
    });

    it.each(ENROLMENT_STATUSES.filter((status) => status !== "pending"))("refuses from %s", (status) => {
      expect(() => build({ status }).approve(NOW)).toThrow(
        expect.objectContaining({ message: "enrolment.notPending", statusCode: 409 }),
      );
    });
  });

  describe("deny", () => {
    it("denies a pending request with the reason", () => {
      const out = build().deny("Nível avançado", NOW);

      expect(out.status).toBe("denied");
      expect(out.reason).toBe("Nível avançado");
      expect(out.decidedAt).toEqual(NOW);
    });

    it("denies without a reason", () => {
      expect(build().deny(null, NOW).reason).toBeNull();
    });

    it.each(ENROLMENT_STATUSES.filter((status) => status !== "pending"))("refuses from %s", (status) => {
      expect(() => build({ status }).deny(null, NOW)).toThrow(
        expect.objectContaining({ message: "enrolment.notPending", statusCode: 409 }),
      );
    });
  });

  describe("withdraw", () => {
    it("ends a pending request as withdrawn", () => {
      const out = build().withdraw(NOW);

      expect(out.status).toBe("withdrawn");
      expect(out.endedAt).toEqual(NOW);
    });

    it.each(ENROLMENT_STATUSES.filter((status) => status !== "pending"))("refuses from %s", (status) => {
      expect(() => build({ status }).withdraw(NOW)).toThrow(
        expect.objectContaining({ message: "enrolment.notPending", statusCode: 409 }),
      );
    });
  });

  describe("cancel", () => {
    it("ends an approved seat as cancelled", () => {
      const out = build({ status: "approved" }).cancel(NOW);

      expect(out.status).toBe("cancelled");
      expect(out.endedAt).toEqual(NOW);
    });

    it.each(ENROLMENT_STATUSES.filter((status) => status !== "approved"))("refuses from %s", (status) => {
      expect(() => build({ status }).cancel(NOW)).toThrow(
        expect.objectContaining({ message: "enrolment.notApproved", statusCode: 409 }),
      );
    });
  });

  describe("takeOut", () => {
    it("ends an approved seat as taken out, keeping the reason", () => {
      const out = build({ status: "approved" }).takeOut("Nível avançado", NOW);

      expect(out.status).toBe("takenOut");
      expect(out.reason).toBe("Nível avançado");
      expect(out.endedAt).toEqual(NOW);
    });

    it("keeps no reason when there is none", () => {
      expect(build({ status: "approved" }).takeOut(null, NOW).reason).toBeNull();
    });

    it.each(ENROLMENT_STATUSES.filter((status) => status !== "approved"))("refuses from %s", (status) => {
      expect(() => build({ status }).takeOut(null, NOW)).toThrow(
        expect.objectContaining({ message: "enrolment.notApproved", statusCode: 409 }),
      );
    });
  });

  describe("expire", () => {
    it("ends a pending request as expired", () => {
      const out = build().expire(NOW);

      expect(out.status).toBe("expired");
      expect(out.endedAt).toEqual(NOW);
    });

    it.each(ENROLMENT_STATUSES.filter((status) => status !== "pending"))("refuses from %s", (status) => {
      expect(() => build({ status }).expire(NOW)).toThrow(DomainError);
    });
  });

  describe("closeForCancelledClass", () => {
    it.each(["pending", "approved"] as const)("ends a %s enrolment as classCancelled", (status) => {
      const out = build({ status }).closeForCancelledClass(NOW);

      expect(out.status).toBe("classCancelled");
      expect(out.endedAt).toEqual(NOW);
    });

    it.each(ENROLMENT_STATUSES.filter((status) => !OPEN_ENROLMENT_STATUSES.includes(status)))(
      "refuses from %s",
      (status) => {
        expect(() => build({ status }).closeForCancelledClass(NOW)).toThrow(
          expect.objectContaining({ message: "enrolment.notOpen", statusCode: 409 }),
        );
      },
    );
  });
});
