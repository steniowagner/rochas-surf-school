import { UseCase } from "@rochas-surf-school/shared";
import {
  ClockProvider,
  EnrolmentClassReader,
  EnrolmentNotifier,
  EnrolmentRepository,
  StudentNameReader,
} from "../provider";

export interface ReleaseStudentEnrolmentsIn {
  studentId: string;
}

export interface ReleaseStudentEnrolmentsOut {
  /** The upcoming seats given up. */
  cancelled: number;
}

/** Gives up what a deleted student holds: upcoming seats are cancelled and pending requests withdrawn. */
export class ReleaseStudentEnrolments
  implements UseCase<ReleaseStudentEnrolmentsIn, ReleaseStudentEnrolmentsOut>
{
  constructor(
    private readonly enrolmentRepository: EnrolmentRepository,
    private readonly classReader: EnrolmentClassReader,
    private readonly studentNameReader: StudentNameReader,
    private readonly enrolmentNotifier: EnrolmentNotifier,
    private readonly clockProvider: ClockProvider,
  ) {}

  /** A failed write propagates; a failed notification never undoes the release. */
  async execute(input: ReleaseStudentEnrolmentsIn): Promise<ReleaseStudentEnrolmentsOut> {
    const cancelled = await this.enrolmentRepository.releaseForStudent(
      input.studentId,
      this.clockProvider.now(),
    );

    for (const enrolment of cancelled) {
      await this.notify(enrolment.classId, input.studentId);
    }

    return { cancelled: cancelled.length };
  }

  private async notify(classId: string, studentId: string): Promise<void> {
    try {
      const found = await this.classReader.findById(classId);
      const studentName = await this.studentNameReader.findName(studentId);

      if (!found || studentName === null) return;

      await this.enrolmentNotifier.seatCancelled({
        classId,
        studentName,
        discipline: found.discipline,
        startsAt: found.startsAt,
        waitingCount: await this.enrolmentRepository.countPendingForClass(classId),
        instructorIds: found.instructorIds,
      });
    } catch {
      // swallowed on purpose
    }
  }
}
