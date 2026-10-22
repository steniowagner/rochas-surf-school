import { NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { ClassActor, assertCanReadClasses } from "../../access";
import {
  ClassContact,
  ClassContactReader,
  ClassRosterReader,
  ClassStudent,
  ClassViewInstructor,
  ClassViewReader,
  PendingRequestCounter,
  ViewerEnrolmentReader,
} from "../provider";
import { ClassItem, canSeeGuestNames, toClassItem } from "./class-item";

export interface GetClassIn {
  actor: ClassActor;
  id: string;
}

export interface GetClassStudent extends ClassStudent {
  /** The number when the viewer may see it (see `visibleNumber`), otherwise null. */
  whatsappNumber: string | null;
}

export interface GetClassInstructor extends ClassViewInstructor {
  role: "instructor" | "admin";
  /** The number when the viewer may see it (see `visibleNumber`), otherwise null. */
  whatsappNumber: string | null;
}

export interface GetClassOut extends Omit<ClassItem, "students" | "instructors"> {
  students: GetClassStudent[];
  instructors: GetClassInstructor[];
  /** The class's enrolment requests still waiting for an answer; null for anyone but an admin. */
  pendingRequests: number | null;
}

const uuidRule = new UuidRule();

/**
 * The directory's rule (`ListPeople`): an approved person's number, when they share it or the viewer is an
 * admin. A person missing from the contacts has none.
 */
function visibleNumber(contact: ClassContact | undefined, actor: ClassActor): string | null {
  if (!contact || contact.status !== "approved" || !contact.whatsappNumber) return null;

  return contact.whatsappVisible || actor.role === "admin" ? contact.whatsappNumber : null;
}

export class GetClass implements UseCase<GetClassIn, GetClassOut> {
  constructor(
    private readonly classViewReader: ClassViewReader,
    private readonly classRosterReader: ClassRosterReader,
    private readonly viewerEnrolmentReader: ViewerEnrolmentReader,
    private readonly pendingRequestCounter: PendingRequestCounter,
    private readonly classContactReader: ClassContactReader,
  ) {}

  async execute(input: GetClassIn): Promise<GetClassOut> {
    assertCanReadClasses(input.actor);

    const view =
      uuidRule.validate(input.id) === null
        ? await this.classViewReader.findById(input.id)
        : null;

    if (!view) {
      throw new NotFoundError("class.notFound");
    }

    const [{ rosters, contacts }, enrolments, pendingRequests] = await Promise.all([
      this.classRosterReader.findRosters([view.id]).then(async (rosters) => ({
        rosters,
        contacts: await this.classContactReader.findContacts([
          ...(rosters.get(view.id)?.students ?? []).map((student) => student.id),
          ...view.instructors.map((instructor) => instructor.id),
        ]),
      })),
      this.viewerEnrolmentReader.findLatest(input.actor.id, [view.id]),
      input.actor.role === "admin" ? this.pendingRequestCounter.countPendingRequests(view.id) : null,
    ]);

    const item = toClassItem(
      view,
      rosters.get(view.id),
      enrolments.get(view.id),
      canSeeGuestNames(input.actor, view),
    );

    return {
      ...item,
      students: item.students.map((student) => ({
        ...student,
        whatsappNumber: visibleNumber(contacts.get(student.id), input.actor),
      })),
      instructors: item.instructors.map((instructor) => ({
        ...instructor,
        role: contacts.get(instructor.id)?.role === "admin" ? "admin" : "instructor",
        whatsappNumber: visibleNumber(contacts.get(instructor.id), input.actor),
      })),
      pendingRequests,
    };
  }
}
