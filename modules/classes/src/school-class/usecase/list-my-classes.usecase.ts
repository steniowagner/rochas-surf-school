import { ForbiddenError, UseCase } from "@rochas-surf-school/shared";
import { ClassActor, assertCanReadClasses } from "../../access";
import {
  CLASS_CARD_STUDENTS_LIMIT,
  ClassRosterReader,
  ClassView,
  ClassViewReader,
  ClockProvider,
  MyClassesReader,
  ViewerEnrolmentReader,
} from "../provider";
import { ClassItem, canSeeGuestNames, toClassItem } from "./class-item";

export interface ListMyClassesIn {
  actor: ClassActor;
}

export interface ListMyClassesOut {
  items: ClassItem[];
}

/** Only students take seats, so only they have classes of their own. */
export function assertIsStudent(actor: ClassActor): void {
  assertCanReadClasses(actor);

  if (actor.role !== "student") {
    throw new ForbiddenError("enrolment.role.notStudent");
  }
}

/** The class items of `views`, in that order, as the student sees them on a card. */
export async function toMyClassItems(
  actor: ClassActor,
  views: ClassView[],
  classRosterReader: ClassRosterReader,
  viewerEnrolmentReader: ViewerEnrolmentReader,
): Promise<ClassItem[]> {
  const classIds = views.map((view) => view.id);
  const [rosters, enrolments] = await Promise.all([
    classRosterReader.findRosters(classIds, CLASS_CARD_STUDENTS_LIMIT),
    viewerEnrolmentReader.findLatest(actor.id, classIds),
  ]);

  return views.map((view) =>
    toClassItem(view, rosters.get(view.id), enrolments.get(view.id), canSeeGuestNames(actor, view)),
  );
}

export class ListMyClasses implements UseCase<ListMyClassesIn, ListMyClassesOut> {
  constructor(
    private readonly myClassesReader: MyClassesReader,
    private readonly classViewReader: ClassViewReader,
    private readonly classRosterReader: ClassRosterReader,
    private readonly viewerEnrolmentReader: ViewerEnrolmentReader,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: ListMyClassesIn): Promise<ListMyClassesOut> {
    assertIsStudent(input.actor);

    const ids = await this.myClassesReader.findCurrentClassIds(input.actor.id, this.clock.now());

    if (ids.length === 0) return { items: [] };

    const views = (await this.classViewReader.findByIds(ids)).sort(
      (a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.id.localeCompare(b.id),
    );

    return {
      items: await toMyClassItems(
        input.actor,
        views,
        this.classRosterReader,
        this.viewerEnrolmentReader,
      ),
    };
  }
}
