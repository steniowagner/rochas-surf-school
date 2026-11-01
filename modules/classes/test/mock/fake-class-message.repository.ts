import {
  ClassMessage,
  ClassMessageRepository,
  ClassMessageSender,
  ClassMessageView,
} from "../../src";

export class FakeClassMessageRepository implements ClassMessageRepository {
  fail = false;
  private readonly messages: ClassMessage[];
  private readonly senders: Map<string, ClassMessageSender>;

  constructor(messages: ClassMessage[] = [], senders: ClassMessageSender[] = []) {
    this.messages = [...messages];
    this.senders = new Map(senders.map((sender) => [sender.id, sender]));
  }

  get stored(): ClassMessage[] {
    return [...this.messages];
  }

  async create(message: ClassMessage): Promise<ClassMessage> {
    if (this.fail) throw new Error("store down");

    this.messages.push(message);
    return message;
  }

  async findByClass(classId: string): Promise<ClassMessageView[]> {
    return this.messages
      .filter((message) => message.classId === classId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((message) => ({
        id: message.id,
        title: message.title,
        message: message.message,
        createdAt: message.createdAt,
        sender: this.senders.get(message.senderId) ?? null,
      }));
  }
}
