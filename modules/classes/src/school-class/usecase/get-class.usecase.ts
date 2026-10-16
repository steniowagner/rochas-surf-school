import { NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { ClassActor, assertCanReadClasses } from "../../access";
import { ClassViewReader } from "../provider";
import { ClassItem, toClassItem } from "./class-item";

export interface GetClassIn {
  actor: ClassActor;
  id: string;
}

export type GetClassOut = ClassItem;

const uuidRule = new UuidRule();

export class GetClass implements UseCase<GetClassIn, GetClassOut> {
  constructor(private readonly classViewReader: ClassViewReader) {}

  async execute(input: GetClassIn): Promise<GetClassOut> {
    assertCanReadClasses(input.actor);

    const view =
      uuidRule.validate(input.id) === null
        ? await this.classViewReader.findById(input.id)
        : null;

    if (!view) {
      throw new NotFoundError("class.notFound");
    }

    return toClassItem(view);
  }
}
