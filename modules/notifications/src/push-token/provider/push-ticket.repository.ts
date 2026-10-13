import { PushTicket } from "../model";

export interface PushTicketRepository {
  createMany(tickets: PushTicket[]): Promise<void>;
  /** The tickets created at or before the date. */
  findCreatedBefore(date: Date): Promise<PushTicket[]>;
  deleteByIds(ids: string[]): Promise<void>;
}
