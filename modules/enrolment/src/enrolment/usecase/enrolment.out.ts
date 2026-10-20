import { Enrolment, EnrolmentStatus } from "../model";

export interface EnrolmentOut {
  id: string;
  classId: string;
  status: EnrolmentStatus;
  requestedAt: Date;
}

export function toEnrolmentOut(enrolment: Enrolment): EnrolmentOut {
  return {
    id: enrolment.id,
    classId: enrolment.classId,
    status: enrolment.status,
    requestedAt: enrolment.requestedAt,
  };
}
