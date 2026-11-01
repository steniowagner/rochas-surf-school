import { MessageSender, MessageSenderReader } from "../../src";

export class FakeMessageSenderReader implements MessageSenderReader {
  readonly calls: string[][] = [];

  constructor(private readonly senders: MessageSender[] = []) {}

  async findSenders(ids: string[]): Promise<Map<string, MessageSender>> {
    this.calls.push(ids);

    return new Map(this.senders.filter((sender) => ids.includes(sender.id)).map((sender) => [sender.id, sender]));
  }
}
