import { NotFoundError, UseCase, UuidRule } from "@rochas-surf-school/shared";
import { UserRole } from "@rochas-surf-school/auth";
import { ClassActor, assertCanReadClasses } from "../../access";
import { SchoolClassRepository } from "../../school-class/provider";
import { visibleNumber } from "../../school-class/usecase/visible-number";
import { ClassMessageRepository, ClassMessageSender } from "../provider";

export interface ListClassMessagesIn {
  actor: ClassActor;
  id: string;
}

export interface ClassMessageSenderOut {
  id: string;
  name: string;
  photoUrl: string | null;
  role: UserRole;
  /** The number when the viewer may see it (see `visibleNumber`), otherwise null. */
  whatsappNumber: string | null;
}

export interface ClassMessageItem {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  sender: ClassMessageSenderOut | null;
}

export interface ListClassMessagesOut {
  items: ClassMessageItem[];
}

const uuidRule = new UuidRule();

function toSenderOut(sender: ClassMessageSender, actor: ClassActor): ClassMessageSenderOut {
  return {
    id: sender.id,
    name: sender.name,
    photoUrl: sender.photoUrl,
    role: sender.role,
    whatsappNumber: visibleNumber(sender, actor),
  };
}

/** The messages of a class, for anyone who can read it, in any class state and with or without a seat there. */
export class ListClassMessages implements UseCase<ListClassMessagesIn, ListClassMessagesOut> {
  constructor(
    private readonly schoolClassRepository: SchoolClassRepository,
    private readonly classMessageRepository: ClassMessageRepository,
  ) {}

  async execute(input: ListClassMessagesIn): Promise<ListClassMessagesOut> {
    assertCanReadClasses(input.actor);

    const stored =
      uuidRule.validate(input.id) === null
        ? await this.schoolClassRepository.findById(input.id)
        : null;

    if (!stored) {
      throw new NotFoundError("class.notFound");
    }

    const messages = await this.classMessageRepository.findByClass(stored.id);

    return {
      items: messages.map(({ sender, ...message }) => ({
        ...message,
        sender: sender ? toSenderOut(sender, input.actor) : null,
      })),
    };
  }
}
