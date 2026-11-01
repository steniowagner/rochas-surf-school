import { CreateRepository } from "@rochas-surf-school/shared";
import { ClassContact } from "../../school-class/provider";
import { ClassMessage } from "../model";

/** Who sent a message: their contact, to apply the WhatsApp rule, and what the reader sees of them. */
export interface ClassMessageSender extends ClassContact {
  name: string;
  photoUrl: string | null;
}

export interface ClassMessageView {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  /** Null once the sender's account was erased. */
  sender: ClassMessageSender | null;
}

export interface ClassMessageRepository extends CreateRepository<ClassMessage> {
  /** The messages of a class, newest first. */
  findByClass(classId: string): Promise<ClassMessageView[]>;
}
