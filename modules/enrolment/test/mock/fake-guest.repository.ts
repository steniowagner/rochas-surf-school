import { AddGuestResult, EnrolmentClass, Guest, GuestRepository } from "../../src";

export class FakeGuestRepository implements GuestRepository {
  private guests: Guest[];

  /**
   * @param approvedSeats how many approved students each class has (class id → count): the fake keeps no
   * enrolments, the database adapter counts them.
   */
  constructor(
    guests: Guest[] = [],
    private readonly classes: EnrolmentClass[] = [],
    private readonly approvedSeats: Record<string, number> = {},
  ) {
    this.guests = [...guests];
  }

  get all(): Guest[] {
    return [...this.guests];
  }

  async create(guest: Guest): Promise<AddGuestResult> {
    const found = this.classes.find((item) => item.id === guest.classId);
    const taken =
      (this.approvedSeats[guest.classId] ?? 0) +
      this.guests.filter((item) => item.classId === guest.classId).length;

    if (!found || taken >= found.capacity) return "full";

    this.guests.push(guest);
    return "added";
  }

  async findById(id: string): Promise<Guest | null> {
    return this.guests.find((item) => item.id === id) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const before = this.guests.length;
    this.guests = this.guests.filter((item) => item.id !== id);
    return this.guests.length < before;
  }

  async eraseEndedBefore(cutoff: Date, now: Date): Promise<number> {
    let erased = 0;

    this.guests = this.guests.map((item) => {
      const found = this.classes.find((candidate) => candidate.id === item.classId);
      const over =
        !!found &&
        (found.endsAt.getTime() <= cutoff.getTime() ||
          (!!found.cancelledAt && found.cancelledAt.getTime() <= cutoff.getTime()));

      if (item.isErased || !over) return item;

      erased += 1;
      return item.erase(now);
    });

    return erased;
  }
}
