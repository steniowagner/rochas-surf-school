import { addDays } from "./date";
import {
  buildEnrolmentClass,
  buildGuest,
  CLASS_ID,
  FakeGuestRepository,
  NOW,
} from ".";

const OTHER_CLASS = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

describe("FakeGuestRepository", () => {
  it("stores guests and finds them by id", async () => {
    const repository = new FakeGuestRepository([], [buildEnrolmentClass()]);
    const guest = buildGuest();

    expect(await repository.create(guest)).toBe("added");
    expect(await repository.findById(guest.id)).toBe(guest);
    expect(await repository.findById("missing")).toBeNull();
    expect(repository.all).toEqual([guest]);
  });

  it("counts the approved students and the guests against the capacity", async () => {
    const repository = new FakeGuestRepository(
      [buildGuest()],
      [buildEnrolmentClass({ capacity: 3 })],
      { [CLASS_ID]: 1 },
    );

    expect(await repository.create(buildGuest())).toBe("added");
    expect(await repository.create(buildGuest())).toBe("full");
    expect(repository.all).toHaveLength(2);
  });

  it("refuses a guest of an unknown class", async () => {
    const repository = new FakeGuestRepository();

    expect(await repository.create(buildGuest())).toBe("full");
  });

  it("deletes a guest once", async () => {
    const guest = buildGuest();
    const repository = new FakeGuestRepository([guest]);

    expect(await repository.delete(guest.id)).toBe(true);
    expect(await repository.delete(guest.id)).toBe(false);
    expect(repository.all).toEqual([]);
  });

  describe("eraseEndedBefore", () => {
    const cutoff = addDays(NOW, -30);

    it("erases the guests of classes that ended or were cancelled by the cutoff, once", async () => {
      const ended = buildEnrolmentClass({ id: CLASS_ID, endsAt: cutoff });
      const cancelled = buildEnrolmentClass({
        id: OTHER_CLASS,
        endsAt: addDays(NOW, 5),
        cancelledAt: cutoff,
      });
      const repository = new FakeGuestRepository(
        [buildGuest(), buildGuest({ classId: OTHER_CLASS })],
        [ended, cancelled],
      );

      expect(await repository.eraseEndedBefore(cutoff, NOW)).toBe(2);
      expect(repository.all.every((item) => item.isErased && item.name === null)).toBe(true);
      expect(await repository.eraseEndedBefore(cutoff, NOW)).toBe(0);
    });

    it("leaves the guests of classes that ended later, are still ahead, or are unknown", async () => {
      const recent = buildEnrolmentClass({ id: CLASS_ID, endsAt: addDays(cutoff, 1) });
      const upcoming = buildEnrolmentClass({
        id: OTHER_CLASS,
        endsAt: addDays(NOW, 5),
        cancelledAt: addDays(cutoff, 1),
      });
      const repository = new FakeGuestRepository(
        [buildGuest(), buildGuest({ classId: OTHER_CLASS }), buildGuest({ classId: "x" })],
        [recent, upcoming],
      );

      expect(await repository.eraseEndedBefore(cutoff, NOW)).toBe(0);
      expect(repository.all.some((item) => item.isErased)).toBe(false);
    });
  });
});
