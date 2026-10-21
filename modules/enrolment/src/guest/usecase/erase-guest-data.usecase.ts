import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider } from "../../enrolment/provider";
import { GuestRepository } from "../provider";

/** How long a guest's name and number outlive the class. */
export const GUEST_DATA_RETENTION_DAYS = 30;

export interface EraseGuestDataOut {
  erased: number;
}

export class EraseGuestData implements UseCase<void, EraseGuestDataOut> {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly clockProvider: ClockProvider,
  ) {}

  async execute(): Promise<EraseGuestDataOut> {
    const now = this.clockProvider.now();
    const cutoff = new Date(now.getTime() - GUEST_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    return { erased: await this.guestRepository.eraseEndedBefore(cutoff, now) };
  }
}
