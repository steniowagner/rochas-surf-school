import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { EditLocation, Location } from "../../../src";
import {
  ADMIN,
  buildClass,
  buildLocation,
  FakeClassAudienceReader,
  FakeClockProvider,
  FakeLocationChangeNotifier,
  FakeLocationRepository,
  INSTRUCTOR,
  INSTRUCTOR_ID,
  STUDENT,
} from "../../mock";

const NOW = new Date("2026-10-18T12:00:00.000Z");
const TOMORROW = new Date("2026-10-19T12:00:00.000Z");
const YESTERDAY = new Date("2026-10-17T12:00:00.000Z");
const DEADLINE = new Date("2026-10-19T08:00:00.000Z");
const OTHER_INSTRUCTOR = "0c9e5b1a-2d3f-4a60-9b71-8e4d6c2f1a03";

const body = {
  name: "Praia do Futuro",
  address: "Av. Zezé Diogo, 5000",
  latitude: -3.7442,
  longitude: -38.4617,
};

function setup(
  location: Location,
  classes = [] as ReturnType<typeof buildClass>[],
  others: Location[] = [],
  audience = new FakeClassAudienceReader(),
) {
  const repository = new FakeLocationRepository([location, ...others], classes);
  const notifier = new FakeLocationChangeNotifier();
  const useCase = new EditLocation(repository, notifier, new FakeClockProvider(NOW), audience);

  return { repository, notifier, useCase };
}

async function errorsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = (await promise.catch((e) => e)) as ValidationException;
  expect(error).toBeInstanceOf(ValidationException);
  return error.errors.map((item) => item.message);
}

describe("EditLocation", () => {
  it("edits the name, the address and the point, answering the location with its upcoming classes", async () => {
    const location = buildLocation("Antigo", "Rua A", { latitude: null, longitude: null });
    const { repository, useCase } = setup(location, [
      buildClass({ locationId: location.id, startsAt: TOMORROW }),
    ]);

    const out = await useCase.execute({ actor: ADMIN, id: location.id, ...body, name: " Praia do Futuro " });

    expect(out).toEqual({ id: location.id, ...body, upcomingClasses: 1 });
    const stored = await repository.findById(location.id);
    expect([stored?.name, stored?.address, stored?.latitude, stored?.longitude]).toEqual([
      body.name,
      body.address,
      body.latitude,
      body.longitude,
    ]);
  });

  it("accepts its own name in another case or accents and a name an archived location had", async () => {
    const location = buildLocation("Praia do Futuro");
    const gone = buildLocation("Cumbuco", "x", { archivedAt: YESTERDAY });
    const { useCase } = setup(location, [], [gone]);

    const own = await useCase.execute({ actor: ADMIN, id: location.id, ...body, name: "PRAIA DO FUTURO" });
    const taken = await useCase.execute({ actor: ADMIN, id: location.id, ...body, name: "Cumbuco" });

    expect(own.name).toBe("PRAIA DO FUTURO");
    expect(taken.name).toBe("Cumbuco");
  });

  it("refuses a name another active location has, ignoring case and accents", async () => {
    const location = buildLocation("Praia do Futuro");
    const other = buildLocation("Iracema");
    const { repository, useCase } = setup(location, [], [other]);

    const error = await useCase
      .execute({ actor: ADMIN, id: location.id, ...body, name: "Ìracema" })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toBe("location.name.duplicate");
    expect((await repository.findById(location.id))?.name).toBe("Praia do Futuro");
    expect(repository.updateCalls).toHaveLength(0);
  });

  it.each(["not-a-uuid", "7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12"])("answers 404 for the id %s", async (id) => {
    const { useCase } = setup(buildLocation("Praia"));

    const error = await useCase.execute({ actor: ADMIN, id, ...body }).catch((e) => e);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe("location.notFound");
  });

  it("refuses an archived location, after the shape", async () => {
    const location = buildLocation("Praia", "x", { archivedAt: YESTERDAY });
    const { useCase } = setup(location);

    const error = await useCase.execute({ actor: ADMIN, id: location.id, ...body }).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toBe("location.archived");
    expect(await errorsOf(useCase.execute({ actor: ADMIN, id: location.id, ...body, name: "" }))).toEqual([
      "location.name.required",
    ]);
  });

  it("collects every shape problem in one refusal and writes nothing", async () => {
    const location = buildLocation("Praia");
    const { repository, useCase } = setup(location);

    expect(
      await errorsOf(
        useCase.execute({
          actor: ADMIN,
          id: location.id,
          name: undefined,
          address: 5,
          latitude: "x",
          longitude: undefined,
          notify: "yes",
        }),
      ),
    ).toEqual([
      "location.name.required",
      "location.address.required",
      "location.point.required",
      "location.notify.invalid",
    ]);
    expect(await errorsOf(useCase.execute({ actor: ADMIN, id: location.id, ...body, latitude: "x" }))).toEqual([
      "location.point.invalid",
    ]);
    expect(await errorsOf(useCase.execute({ actor: ADMIN, id: location.id, ...body, latitude: null }))).toEqual([
      "location.point.required",
    ]);
    expect(repository.updateCalls).toHaveLength(0);
  });

  it("answers an unchanged save without writing or telling anybody", async () => {
    const location = buildLocation("Praia", "Rua A", { latitude: 1, longitude: 2 });
    const { repository, notifier, useCase } = setup(location, [
      buildClass({ locationId: location.id, startsAt: TOMORROW, cancellationDeadline: DEADLINE }),
    ]);

    const out = await useCase.execute({
      actor: ADMIN,
      id: location.id,
      name: " Praia ",
      address: "Rua A",
      latitude: 1,
      longitude: 2,
      notify: true,
    });

    expect(out).toEqual({
      id: location.id,
      name: "Praia",
      address: "Rua A",
      latitude: 1,
      longitude: 2,
      upcomingClasses: 1,
    });
    expect(repository.updateCalls).toHaveLength(0);
    expect(repository.allClasses[0].cancellationDeadline).toEqual(DEADLINE);
    expect(notifier.events).toHaveLength(0);
  });

  describe("deadline", () => {
    function classesAt(location: Location) {
      return [
        buildClass({ locationId: location.id, startsAt: TOMORROW, cancellationDeadline: DEADLINE }),
        buildClass({ locationId: location.id, startsAt: YESTERDAY, cancellationDeadline: DEADLINE }),
        buildClass({
          locationId: location.id,
          startsAt: TOMORROW,
          cancelledAt: YESTERDAY,
          cancellationDeadline: DEADLINE,
        }),
        buildClass({ locationId: "c3f1a9d2-6e47-4b58-8d03-1f2a7b9c4e00", startsAt: TOMORROW, cancellationDeadline: DEADLINE }),
      ];
    }

    it.each([
      ["address", { address: "Rua nova" }],
      ["name", { name: "Outro nome" }],
    ])("clears the upcoming deadlines when the %s changes", async (_label, change) => {
      const location = buildLocation("Praia", "Rua A", { latitude: -3.7442, longitude: -38.4617 });
      const { repository, useCase } = setup(location, classesAt(location));

      await useCase.execute({ actor: ADMIN, id: location.id, ...body, name: "Praia", address: "Rua A", ...change });

      const stored = repository.allClasses;
      expect(stored[0].cancellationDeadline).toBeNull();
      expect(stored[0].deadlineRevision).toBe(1);
      expect(stored.slice(1).map((item) => item.cancellationDeadline)).toEqual([DEADLINE, DEADLINE, DEADLINE]);
    });

    it("keeps every deadline when only the point moves", async () => {
      const location = buildLocation("Praia", "Rua A", { latitude: 1, longitude: 2 });
      const { repository, useCase } = setup(location, classesAt(location));

      await useCase.execute({ actor: ADMIN, id: location.id, ...body, name: "Praia", address: "Rua A" });

      expect(repository.updateCalls[0].options.clearDeadlinesFrom).toBeNull();
      expect(repository.allClasses.map((item) => item.cancellationDeadline)).toEqual([
        DEADLINE,
        DEADLINE,
        DEADLINE,
        DEADLINE,
      ]);
    });

    it("clears nothing when the edit is refused", async () => {
      const location = buildLocation("Praia", "Rua A");
      const { repository, useCase } = setup(location, classesAt(location));

      await useCase.execute({ actor: ADMIN, id: location.id, ...body, address: "" }).catch(() => undefined);

      expect(repository.allClasses.every((item) => item.cancellationDeadline)).toBe(true);
    });
  });

  describe("notification", () => {
    function setupClasses() {
      const location = buildLocation("Praia", "Rua A");
      const classes = [
        buildClass({ locationId: location.id, startsAt: TOMORROW }),
        buildClass({ locationId: location.id, startsAt: TOMORROW }),
        buildClass({ locationId: location.id, startsAt: TOMORROW, instructorIds: [OTHER_INSTRUCTOR, ADMIN.id] }),
        buildClass({ locationId: location.id, startsAt: YESTERDAY }),
        buildClass({ locationId: location.id, startsAt: TOMORROW, cancelledAt: YESTERDAY }),
      ];

      return { location, ...setup(location, classes) };
    }

    it("tells each instructor of the upcoming classes once, except the editor", async () => {
      const { location, notifier, useCase } = setupClasses();

      await useCase.execute({ actor: ADMIN, id: location.id, ...body, notify: true });

      expect(notifier.events).toEqual([
        {
          recipients: [
            { userId: OTHER_INSTRUCTOR, count: 1 },
            { userId: INSTRUCTOR_ID, count: 2 },
          ],
          locationName: "Praia do Futuro",
        },
      ]);
    });

    it.each([[undefined], [false]])("tells nobody when notify is %s", async (notify) => {
      const { location, notifier, useCase } = setupClasses();

      await useCase.execute({ actor: ADMIN, id: location.id, ...body, notify });

      expect(notifier.events).toHaveLength(0);
    });

    it("tells nobody when no upcoming class has an instructor other than the editor", async () => {
      const location = buildLocation("Praia");
      const { notifier, useCase } = setup(location, [
        buildClass({ locationId: location.id, startsAt: TOMORROW, instructorIds: [ADMIN.id] }),
      ]);

      await useCase.execute({ actor: ADMIN, id: location.id, ...body, notify: true });

      expect(notifier.events).toHaveLength(0);
    });

    describe("students", () => {
      const STUDENT_ID = "5d6e7f80-9a1b-4c2d-8e3f-4a5b6c7d8e9f";

      function setupAudience(members: { userId: string; count: number }[]) {
        const location = buildLocation("Praia");
        const audience = new FakeClassAudienceReader({}, { [location.id]: members });
        const classes = [
          buildClass({ locationId: location.id, startsAt: TOMORROW, instructorIds: [INSTRUCTOR_ID] }),
        ];

        return { location, audience, ...setup(location, classes, [], audience) };
      }

      it("tells the students of the upcoming classes with their own counts, as the instructors", async () => {
        const { location, notifier, useCase, audience } = setupAudience([
          { userId: STUDENT_ID, count: 2 },
        ]);

        await useCase.execute({ actor: ADMIN, id: location.id, ...body, notify: true });

        expect(notifier.events).toEqual([
          {
            recipients: [
              { userId: INSTRUCTOR_ID, count: 1 },
              { userId: STUDENT_ID, count: 2 },
            ],
            locationName: "Praia do Futuro",
          },
        ]);
        expect(audience.locationCalls).toEqual([{ locationId: location.id, now: NOW }]);
      });

      it("sends one notification with the larger count to a person who is also an instructor", async () => {
        const { location, notifier, useCase } = setupAudience([{ userId: INSTRUCTOR_ID, count: 3 }]);

        await useCase.execute({ actor: ADMIN, id: location.id, ...body, notify: true });

        expect(notifier.events[0]!.recipients).toEqual([{ userId: INSTRUCTOR_ID, count: 3 }]);
      });

      it("keeps the smaller count out when the instructor count is larger", async () => {
        const { location, notifier, useCase } = setupAudience([{ userId: INSTRUCTOR_ID, count: 0 }]);

        await useCase.execute({ actor: ADMIN, id: location.id, ...body, notify: true });

        expect(notifier.events[0]!.recipients).toEqual([{ userId: INSTRUCTOR_ID, count: 1 }]);
      });

      it("never tells the editing admin, even when they hold a seat", async () => {
        const { location, notifier, useCase } = setupAudience([
          { userId: ADMIN.id, count: 1 },
          { userId: STUDENT_ID, count: 1 },
        ]);

        await useCase.execute({ actor: ADMIN, id: location.id, ...body, notify: true });

        expect(notifier.events[0]!.recipients.map((item) => item.userId)).toEqual([
          INSTRUCTOR_ID,
          STUDENT_ID,
        ]);
      });

      it("tells the students even when no instructor besides the editor is left", async () => {
        const location = buildLocation("Praia");
        const audience = new FakeClassAudienceReader({}, { [location.id]: [{ userId: STUDENT_ID, count: 1 }] });
        const { notifier, useCase } = setup(
          location,
          [buildClass({ locationId: location.id, startsAt: TOMORROW, instructorIds: [ADMIN.id] })],
          [],
          audience,
        );

        await useCase.execute({ actor: ADMIN, id: location.id, ...body, notify: true });

        expect(notifier.events[0]!.recipients).toEqual([{ userId: STUDENT_ID, count: 1 }]);
      });

      it("tells nobody when notify is false, without reading the students", async () => {
        const { location, notifier, useCase, audience } = setupAudience([{ userId: STUDENT_ID, count: 1 }]);

        await useCase.execute({ actor: ADMIN, id: location.id, ...body, notify: false });

        expect(notifier.events).toHaveLength(0);
        expect(audience.locationCalls).toHaveLength(0);
      });

      it("tells the instructors only when the students can't be read", async () => {
        const { location, notifier, useCase, audience } = setupAudience([{ userId: STUDENT_ID, count: 1 }]);
        audience.fail = true;

        await useCase.execute({ actor: ADMIN, id: location.id, ...body, notify: true });

        expect(notifier.events[0]!.recipients).toEqual([{ userId: INSTRUCTOR_ID, count: 1 }]);
      });
    });

    it("keeps the edit and the answer when the notifier fails", async () => {
      const { location, notifier, repository, useCase } = setupClasses();
      notifier.fail = true;

      const out = await useCase.execute({ actor: ADMIN, id: location.id, ...body, notify: true });

      expect(out.name).toBe("Praia do Futuro");
      expect((await repository.findById(location.id))?.address).toBe(body.address);
    });
  });

  it("refuses accounts that are not approved admins, checking the status first", async () => {
    const location = buildLocation("Praia");
    const { repository, useCase } = setup(location);
    const input = { id: location.id, ...body };

    const pending = await useCase.execute({ actor: { ...ADMIN, status: "pending" }, ...input }).catch((e) => e);
    const student = await useCase.execute({ actor: STUDENT, ...input }).catch((e) => e);
    const instructor = await useCase.execute({ actor: INSTRUCTOR, ...input }).catch((e) => e);

    expect(pending).toBeInstanceOf(ForbiddenError);
    expect(pending.message).toBe("user.status.notApproved");
    expect(student.message).toBe("user.role.notAdmin");
    expect(instructor.message).toBe("user.role.notAdmin");
    expect(repository.updateCalls).toHaveLength(0);
  });
});
