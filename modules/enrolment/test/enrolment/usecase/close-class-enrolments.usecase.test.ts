import { CloseClassEnrolments } from "../../../src";
import {
  buildEnrolment,
  CLASS_ID,
  FakeClockProvider,
  FakeEnrolmentRepository,
  NOW,
  STUDENT,
} from "../../mock";

const OTHER_STUDENT = "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b";
const ENDED_STUDENT = "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d";
const OTHER_CLASS = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

function setup() {
  const enrolments = new FakeEnrolmentRepository([
    buildEnrolment(),
    buildEnrolment({ studentId: OTHER_STUDENT, status: "approved" }),
    buildEnrolment({ studentId: ENDED_STUDENT, status: "withdrawn" }),
    buildEnrolment({ classId: OTHER_CLASS }),
  ]);

  return { enrolments, useCase: new CloseClassEnrolments(enrolments, new FakeClockProvider(NOW)) };
}

describe("CloseClassEnrolments", () => {
  it("ends the pending and approved enrolments and returns their students", async () => {
    const { useCase, enrolments } = setup();

    expect(await useCase.execute({ classId: CLASS_ID })).toEqual({
      studentIds: [STUDENT.id, OTHER_STUDENT],
    });
    expect(enrolments.all.map((item) => item.status)).toEqual([
      "classCancelled",
      "classCancelled",
      "withdrawn",
      "pending",
    ]);
  });

  it("returns nobody for a class without open enrolments, and when run again", async () => {
    const { useCase } = setup();

    expect(await useCase.execute({ classId: "3d4e5f6a-7b8c-4d9e-8f0a-1b2c3d4e5f6a" })).toEqual({ studentIds: [] });

    await useCase.execute({ classId: CLASS_ID });
    expect(await useCase.execute({ classId: CLASS_ID })).toEqual({ studentIds: [] });
  });
});
