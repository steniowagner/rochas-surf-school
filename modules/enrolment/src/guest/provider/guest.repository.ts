import { Guest } from "../model";

/** What adding a guest came to. */
export type AddGuestResult = "added" | "full";

export interface GuestRepository {
  /**
   * Stores the guest through the seat write shared with approvals: locks the class, counts the seats taken
   * (approved students plus guests) and writes only while one is free. Of two simultaneous writes for the last
   * seat exactly one is `added`.
   */
  create(guest: Guest): Promise<AddGuestResult>;
  /** The guest, or null when there is none. */
  findById(id: string): Promise<Guest | null>;
  /** Removes the guest. Returns whether it deleted (`false` when it was already gone). */
  delete(id: string): Promise<boolean>;
  /**
   * Erases the name and number (and sets `erasedAt` to `now`) of the guests not erased yet whose class ended at
   * or before `cutoff`, or was cancelled at or before it. Returns how many it erased; a second run erases none.
   */
  eraseEndedBefore(cutoff: Date, now: Date): Promise<number>;
}
