import { NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { ClassActor, assertCanReadClasses } from "../../access";
import { ClassRosterReader, ClassViewReader, ViewerEnrolmentReader } from "../provider";
import { ClassItem, toClassItem } from "./class-item";

export interface GetClassIn {
  actor: ClassActor;
  id: string;
}

export type GetClassOut = ClassItem;

const uuidRule = new UuidRule();

export class GetClass implements UseCase<GetClassIn, GetClassOut> {
  constructor(
    private readonly classViewReader: ClassViewReader,
    private readonly classRosterReader: ClassRosterReader,
    private readonly viewerEnrolmentReader: ViewerEnrolmentReader,
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

    const [rosters, enrolments] = await Promise.all([
      this.classRosterReader.findRosters([view.id]),
      this.viewerEnrolmentReader.findLatest(input.actor.id, [view.id]),
    ]);

    return toClassItem(view, rosters.get(view.id), enrolments.get(view.id));
  }
}
