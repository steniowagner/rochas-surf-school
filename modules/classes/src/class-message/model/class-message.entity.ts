import {
  Entity,
  EntityState,
  RangeLengthRule,
  RequiredRule,
  UuidRule,
  Validator,
} from "@rochas-surf-school/shared";
import { CLASS_MESSAGE_TEXT_MAX, CLASS_MESSAGE_TITLE_MAX } from "../../school-class/model";

export interface ClassMessageState extends EntityState {
  classId: string;
  senderId: string;
  /** Written by the admin, shown as written. */
  title: string;
  message: string;
}

/** A message an admin sent to a class, kept on it so anyone who opens the class can read it. */
export class ClassMessage extends Entity<ClassMessageState> {
  constructor(props: ClassMessageState) {
    super(props);
  }

  get classId(): string {
    return this.props.classId;
  }

  get senderId(): string {
    return this.props.senderId;
  }

  get title(): string {
    return this.props.title;
  }

  get message(): string {
    return this.props.message;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "class.message.classId",
        value: this.classId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "class.message.senderId",
        value: this.senderId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "class.message.title",
        value: this.title,
        rules: [new RequiredRule(), new RangeLengthRule(1, CLASS_MESSAGE_TITLE_MAX)],
      },
      {
        code: "class.message.text",
        value: this.message,
        rules: [new RequiredRule(), new RangeLengthRule(1, CLASS_MESSAGE_TEXT_MAX)],
      },
    ]);
  }
}
