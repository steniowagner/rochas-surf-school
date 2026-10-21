import { NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { ClassActor, assertCanReadClasses } from "../../access";
import {
  ClassRosterReader,
  ClassViewReader,
  PendingRequestCounter,
  ViewerEnrolmentReader,
} from "../provider";
import { ClassItem, canSeeGuestNames, toClassItem } from "./class-item";

export interface GetClassIn {
  actor: ClassActor;
  id: string;
}

export interface GetClassOut extends ClassItem {
  /** The class's enrolment requests still waiting for an answer; null for anyone but an admin. */
  pendingRequests: number | null;
}

const uuidRule = new UuidRule();

export class GetClass implements UseCase<GetClassIn, GetClassOut> {
  constructor(
    private readonly classViewReader: ClassViewReader,
    private readonly classRosterReader: ClassRosterReader,
    private readonly viewerEnrolmentReader: ViewerEnrolmentReader,
    private readonly pendingRequestCounter: PendingRequestCounter,
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

    const [rosters, enrolments, pendingRequests] = await Promise.all([
      this.classRosterReader.findRosters([view.id]),
      this.viewerEnrolmentReader.findLatest(input.actor.id, [view.id]),
      input.actor.role === "admin" ? this.pendingRequestCounter.countPendingRequests(view.id) : null,
    ]);

    return {
      ...toClassItem(
        view,
        rosters.get(view.id),
        enrolments.get(view.id),
        canSeeGuestNames(input.actor, view),
      ),
      pendingRequests,
    };
  }
}
