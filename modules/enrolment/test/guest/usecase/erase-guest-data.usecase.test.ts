import { EraseGuestData, GUEST_DATA_RETENTION_DAYS } from "../../../src";
import {
  addDays,
  buildEnrolmentClass,
  buildGuest,
  CLASS_ID,
  FakeClockProvider,
  FakeGuestRepository,
  NOW,
} from "../../mock";

function setup(endsAt: Date, cancelledAt: Date | null = null) {
  const found = buildEnrolmentClass({ endsAt, cancelledAt });
  const guests = new FakeGuestRepository([buildGuest()], [found]);

  return { guests, useCase: new EraseGuestData(guests, new FakeClockProvider(NOW)) };
}

describe("EraseGuestData", () => {
  it("keeps the retention at 30 days", () => {
    expect(GUEST_DATA_RETENTION_DAYS).toBe(30);
  });

  it("erases the guests of a class that ended 30 days ago", async () => {
    const { useCase, guests } = setup(addDays(NOW, -30));

    expect(await useCase.execute()).toEqual({ erased: 1 });
    const [erased] = guests.all;
    expect(erased.name).toBeNull();
    expect(erased.whatsappNumber).toBeNull();
    expect(erased.erasedAt).toEqual(NOW);
    expect(erased.classId).toBe(CLASS_ID);
  });

  it("erases the guests of a class cancelled 30 days ago", async () => {
    const { useCase } = setup(addDays(NOW, 5), addDays(NOW, -31));

    expect(await useCase.execute()).toEqual({ erased: 1 });
  });

  it("leaves the guests of a class that ended 29 days ago", async () => {
    const { useCase, guests } = setup(addDays(NOW, -29));

    expect(await useCase.execute()).toEqual({ erased: 0 });
    expect(guests.all[0].name).toBe("Carolina Reis");
  });

  it("changes nothing on a second run", async () => {
    const { useCase } = setup(addDays(NOW, -40));

    await useCase.execute();

    expect(await useCase.execute()).toEqual({ erased: 0 });
  });
});
