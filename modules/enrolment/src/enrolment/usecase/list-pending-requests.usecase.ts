import { ClassActor, assertCanManageClasses } from "@rochas-surf-school/classes";
import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider, EnrolmentRepository, PendingRequestsClass } from "../provider";

export interface ListPendingRequestsIn {
  actor: ClassActor;
}

export interface ListPendingRequestsOut {
  /** The number of pending requests across the classes. */
  total: number;
  classes: PendingRequestsClass[];
}

export class ListPendingRequests implements UseCase<ListPendingRequestsIn, ListPendingRequestsOut> {
  constructor(
    private readonly enrolmentRepository: EnrolmentRepository,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(input: ListPendingRequestsIn): Promise<ListPendingRequestsOut> {
    assertCanManageClasses(input.actor);

    const classes = await this.enrolmentRepository.findPendingByClass(this.clockProvider.now());

    return {
      total: classes.reduce((sum, item) => sum + item.requests.length, 0),
      classes,
    };
  }
}
