import { ViewerEnrolment, ViewerEnrolmentReader } from "../../src";

export class FakeViewerEnrolmentReader implements ViewerEnrolmentReader {
  readonly calls: { viewerId: string; classIds: string[] }[] = [];

  /** `enrolments` maps `${viewerId}:${classId}` to the viewer's latest enrolment there. */
  constructor(private readonly enrolments: Record<string, ViewerEnrolment> = {}) {}

  async findLatest(viewerId: string, classIds: string[]): Promise<Map<string, ViewerEnrolment>> {
    this.calls.push({ viewerId, classIds });

    const found = new Map<string, ViewerEnrolment>();

    for (const classId of classIds) {
      const enrolment = this.enrolments[`${viewerId}:${classId}`];

      if (enrolment) found.set(classId, enrolment);
    }

    return found;
  }
}
