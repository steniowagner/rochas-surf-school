import { UseCase } from "@rochas-surf-school/shared";
import {
  ClockProvider,
  DEVICE_NOT_REGISTERED,
  PushProvider,
} from "../../notification/provider";
import { PushTicketRepository, PushTokenRepository } from "../provider";

const RECEIPT_DELAY_MS = 15 * 60_000;
const RECEIPT_RETENTION_MS = 24 * 60 * 60_000;

/**
 * Asks Expo for the receipts of the tickets that are 15 minutes old and deletes the token of each device it says
 * is no longer registered. Every ticket asked about is deleted, so a later run never asks twice; tickets older
 * than 24 hours (which Expo no longer keeps) are deleted without asking.
 */
export class CheckPushReceipts implements UseCase<void, void> {
  constructor(
    private readonly pushTicketRepository: PushTicketRepository,
    private readonly pushTokenRepository: PushTokenRepository,
    private readonly pushProvider: PushProvider,
    private readonly clock: ClockProvider,
  ) {}

  async execute(): Promise<void> {
    const now = this.clock.now().getTime();
    const due = await this.pushTicketRepository.findCreatedBefore(
      new Date(now - RECEIPT_DELAY_MS),
    );
    if (due.length === 0) {
      return;
    }

    const stale = due.filter(
      (ticket) => now - ticket.createdAt.getTime() > RECEIPT_RETENTION_MS,
    );
    const asked = due.filter((ticket) => !stale.includes(ticket));

    if (asked.length > 0) {
      const receipts = await this.pushProvider.getReceipts(
        asked.map((ticket) => ticket.id),
      );
      const unregistered = asked
        .filter(
          (ticket) =>
            receipts[ticket.id]?.status === "error" &&
            (receipts[ticket.id] as { details?: { error?: string } }).details
              ?.error === DEVICE_NOT_REGISTERED,
        )
        .map((ticket) => ticket.token);
      if (unregistered.length > 0) {
        await this.pushTokenRepository.deleteByTokens(unregistered);
      }
    }

    await this.pushTicketRepository.deleteByIds(due.map((ticket) => ticket.id));
  }
}
