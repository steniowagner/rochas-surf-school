import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider, EnrolmentRepository } from "../provider";

export interface CloseClassEnrolmentsIn {
  classId: string;
}

export interface CloseClassEnrolmentsOut {
  /** The students whose pending or approved enrolment was ended, each once. */
  studentIds: string[];
}

export class CloseClassEnrolments implements UseCase<CloseClassEnrolmentsIn, CloseClassEnrolmentsOut> {
  constructor(
    private readonly enrolmentRepository: EnrolmentRepository,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: CloseClassEnrolmentsIn): Promise<CloseClassEnrolmentsOut> {
    const closed = await this.enrolmentRepository.closeOpenForClass(
      input.classId,
      this.clockProvider.now(),
    );

    return { studentIds: [...new Set(closed.map((item) => item.studentId))] };
  }
}
