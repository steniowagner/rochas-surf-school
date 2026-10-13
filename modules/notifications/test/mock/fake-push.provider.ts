import {
  PushMessage,
  PushProvider,
  PushReceipt,
  PushSendTicket,
} from "../../src";

export class FakePushProvider implements PushProvider {
  readonly sent: PushMessage[] = [];
  readonly receiptRequests: string[][] = [];
  /** Ticket by token; every other token gets an ok ticket named after it. */
  ticketsByToken: Record<string, PushSendTicket> = {};
  receipts: Record<string, PushReceipt> = {};
  sendError: Error | null = null;
  receiptsError: Error | null = null;

  async send(messages: PushMessage[]): Promise<PushSendTicket[]> {
    this.sent.push(...messages);
    if (this.sendError) throw this.sendError;
    return messages.map(
      (message) =>
        this.ticketsByToken[message.token] ?? {
          status: "ok",
          id: `ticket-${message.token}`,
        },
    );
  }

  async getReceipts(ticketIds: string[]): Promise<Record<string, PushReceipt>> {
    this.receiptRequests.push(ticketIds);
    if (this.receiptsError) throw this.receiptsError;
    const found: Record<string, PushReceipt> = {};
    for (const id of ticketIds) {
      if (this.receipts[id]) found[id] = this.receipts[id];
    }
    return found;
  }
}
