import { ForbiddenError, UseCase } from "@rochas-surf-school/shared";
import { ClassActor, assertCanReadClasses } from "../../access";
import {
  CLASS_CARD_STUDENTS_LIMIT,
  ClassRosterReader,
  ClassViewReader,
  ClockProvider,
  TeachingClassesReader,
} from "../provider";
import { ClassItem, toClassItem } from "./class-item";

export interface ListTeachingClassesIn {
  actor: ClassActor;
}

export interface ListTeachingClassesOut {
  items: ClassItem[];
  /** Whether the caller is an instructor of any class, ended and cancelled ones included. */
  teachesAny: boolean;
}

/** Only instructors and admins can be given classes to teach. */
export function assertIsTeacher(actor: ClassActor): void {
  assertCanReadClasses(actor);

  if (actor.role !== "instructor" && actor.role !== "admin") {
    throw new ForbiddenError("user.role.notTeacher");
  }
}

export class ListTeachingClasses implements UseCase<ListTeachingClassesIn, ListTeachingClassesOut> {
  constructor(
    private readonly teachingClassesReader: TeachingClassesReader,
    private readonly classViewReader: ClassViewReader,
    private readonly classRosterReader: ClassRosterReader,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: ListTeachingClassesIn): Promise<ListTeachingClassesOut> {
    assertIsTeacher(input.actor);

    const [ids, teachesAny] = await Promise.all([
      this.teachingClassesReader.findCurrentClassIds(input.actor.id, this.clock.now()),
      this.teachingClassesReader.teachesAny(input.actor.id),
    ]);

    if (ids.length === 0) return { items: [], teachesAny };

    const views = (await this.classViewReader.findByIds(ids)).sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.id.localeCompare(b.id),
    );
    const rosters = await this.classRosterReader.findRosters(
      views.map((view) => view.id),
      CLASS_CARD_STUDENTS_LIMIT,
    );

    // The caller teaches every class listed, so they see the guests' names; teachers have no enrolment.
    return {
      items: views.map((view) => toClassItem(view, rosters.get(view.id), undefined, true)),
      teachesAny,
    };
  }
}
