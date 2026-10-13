import { PushTicket, PushTicketRepository } from "../../src";

export class FakePushTicketRepository implements PushTicketRepository {
  items: PushTicket[];

  constructor(items: PushTicket[] = []) {
    this.items = [...items];
  }

  async createMany(tickets: PushTicket[]): Promise<void> {
    this.items.push(...tickets);
  }

  async findCreatedBefore(date: Date): Promise<PushTicket[]> {
    return this.items.filter(
      (item) => item.createdAt.getTime() <= date.getTime(),
    );
  }

  async deleteByIds(ids: string[]): Promise<void> {
    this.items = this.items.filter((item) => !ids.includes(item.id));
  }

  ids(): string[] {
    return this.items.map((item) => item.id);
  }
}
