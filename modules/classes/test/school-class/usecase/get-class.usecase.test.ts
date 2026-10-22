import { ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { ClassContact, GetClass } from "../../../src";
import {
  ADMIN,
  buildClassView,
  INSTRUCTOR,
  FakeClassContactReader,
  FakeClassRosterReader,
  FakeClassViewReader,
  FakePendingRequestCounter,
  FakeViewerEnrolmentReader,
  STUDENT,
} from "../../mock";

const ID = "9e1b7a30-4c52-4d86-b0a3-6f2d8c5e1a47";
const SEVEN = Array.from({ length: 7 }, (_, index) => ({
  id: `s-${index}`,
  name: `Aluno ${index}`,
  photoUrl: null,
  enrolmentId: `e-${index}`,
}));

function setup() {
  const reader = new FakeClassViewReader([
    buildClassView({
      id: ID,
      notes: "Ponto de encontro",
      instructors: [
        { id: "i-2", name: "Bruno" },
        { id: "i-1", name: "ana" },
      ],
    }),
  ]);

  const rosterReader = new FakeClassRosterReader({ [ID]: { students: SEVEN } });

  return { reader, rosterReader, useCase: new GetClass(reader, rosterReader, new FakeViewerEnrolmentReader(), new FakePendingRequestCounter(), new FakeClassContactReader()) };
}

const GUESTS = [
  { id: "g-1", name: "Carolina Reis" },
  { id: "g-2", name: null },
];

function setupWithGuests(instructorId = INSTRUCTOR.id) {
  const reader = new FakeClassViewReader([
    buildClassView({ id: ID, instructors: [{ id: instructorId, name: "Ana" }] }),
  ]);
  const rosters = new FakeClassRosterReader({ [ID]: { students: SEVEN.slice(0, 2), guests: GUESTS } });

  return new GetClass(reader, rosters, new FakeViewerEnrolmentReader(), new FakePendingRequestCounter(), new FakeClassContactReader());
}

describe("GetClass", () => {
  describe("guests", () => {
    it("shows the names to an admin and to the class's instructor, and counts the guests as seats", async () => {
      for (const actor of [ADMIN, INSTRUCTOR]) {
        const out = await setupWithGuests().execute({ actor, id: ID });

        expect(out.guests).toEqual(GUESTS);
        expect(out.seatsTaken).toBe(4);
      }
    });

    it("hides the names from students and from another class's instructors, keeping the seats", async () => {
      const other = { ...INSTRUCTOR, id: "0f1e2d3c-4b5a-4968-8776-5a4b3c2d1e0f" };

      for (const actor of [STUDENT, other]) {
        const out = await setupWithGuests().execute({ actor, id: ID });

        expect(out.guests).toEqual([
          { id: "g-1", name: null },
          { id: "g-2", name: null },
        ]);
        expect(out.seatsTaken).toBe(4);
      }
    });

    it("answers no guests for a class without any", async () => {
      const { useCase } = setup();

      expect((await useCase.execute({ actor: ADMIN, id: ID })).guests).toEqual([]);
    });
  });

  it("carries a missing point as null (location point)", async () => {
    const reader = new FakeClassViewReader([
      buildClassView({
        id: ID,
        location: { id: "l-1", name: "Antigo", address: "Rua A", latitude: null, longitude: null },
      }),
    ]);

    const out = await new GetClass(reader, new FakeClassRosterReader(), new FakeViewerEnrolmentReader(), new FakePendingRequestCounter(), new FakeClassContactReader()).execute({ actor: STUDENT, id: ID });

    expect(out.location).toEqual({ id: "l-1", name: "Antigo", address: "Rua A", latitude: null, longitude: null });
  });

  it("answers one class with its location and sorted instructors", async () => {
    const out = await setup().useCase.execute({ actor: STUDENT, id: ID });

    expect(out).toMatchObject({
      id: ID,
      startsAt: "2026-10-15T11:00:00.000Z",
      notes: "Ponto de encontro",
      location: { name: "Praia do Futuro", address: "Av. Zezé Diogo, 1000", latitude: -3.7442, longitude: -38.4617 },
      instructors: [
        { id: "i-1", name: "ana", role: "instructor", whatsappNumber: null },
        { id: "i-2", name: "Bruno", role: "instructor", whatsappNumber: null },
      ],
    });
  });

  it("answers all the students of the class and its seats taken", async () => {
    const { rosterReader, useCase } = setup();

    const out = await useCase.execute({ actor: STUDENT, id: ID });

    expect(out.seatsTaken).toBe(7);
    expect(out.students).toEqual(SEVEN.map((student) => ({ ...student, whatsappNumber: null })));
    expect(rosterReader.calls).toEqual([{ classIds: [ID], studentsLimit: undefined }]);
  });

  it("answers no seats taken for a class the roster reader does not know", async () => {
    const reader = new FakeClassViewReader([buildClassView({ id: ID })]);

    const out = await new GetClass(reader, new FakeClassRosterReader(), new FakeViewerEnrolmentReader(), new FakePendingRequestCounter(), new FakeClassContactReader()).execute({ actor: STUDENT, id: ID });

    expect(out).toMatchObject({ seatsTaken: 0, students: [] });
  });

  it("carries the caller's enrolment, and null when they have none", async () => {
    const requestedAt = new Date("2026-10-14T10:00:00.000Z");
    const reader = new FakeClassViewReader([buildClassView({ id: ID })]);
    const viewerReader = new FakeViewerEnrolmentReader({
      [`${STUDENT.id}:${ID}`]: { id: "e-1", status: "pending", requestedAt },
    });
    const useCase = new GetClass(reader, new FakeClassRosterReader(), viewerReader, new FakePendingRequestCounter(), new FakeClassContactReader());

    expect((await useCase.execute({ actor: STUDENT, id: ID })).myEnrolment).toEqual({
      id: "e-1",
      status: "pending",
      requestedAt: "2026-10-14T10:00:00.000Z",
      reason: null,
    });
    expect((await useCase.execute({ actor: ADMIN, id: ID })).myEnrolment).toBeNull();
    expect(viewerReader.calls).toEqual([
      { viewerId: STUDENT.id, classIds: [ID] },
      { viewerId: ADMIN.id, classIds: [ID] },
    ]);
  });

  it("carries the reason of a denied enrolment", async () => {
    const requestedAt = new Date("2026-10-14T10:00:00.000Z");
    const viewerReader = new FakeViewerEnrolmentReader({
      [`${STUDENT.id}:${ID}`]: { id: "e-2", status: "denied", requestedAt, reason: "Nível avançado" },
    });
    const useCase = new GetClass(new FakeClassViewReader([buildClassView({ id: ID })]), new FakeClassRosterReader(), viewerReader, new FakePendingRequestCounter(), new FakeClassContactReader());

    expect((await useCase.execute({ actor: STUDENT, id: ID })).myEnrolment).toEqual({
      id: "e-2",
      status: "denied",
      requestedAt: "2026-10-14T10:00:00.000Z",
      reason: "Nível avançado",
    });
  });

  it("carries a cancelled enrolment as the caller's latest one", async () => {
    const requestedAt = new Date("2026-10-14T10:00:00.000Z");
    const viewerReader = new FakeViewerEnrolmentReader({
      [`${STUDENT.id}:${ID}`]: { id: "e-3", status: "cancelled", requestedAt },
    });
    const useCase = new GetClass(new FakeClassViewReader([buildClassView({ id: ID })]), new FakeClassRosterReader(), viewerReader, new FakePendingRequestCounter(), new FakeClassContactReader());

    expect((await useCase.execute({ actor: STUDENT, id: ID })).myEnrolment).toEqual({
      id: "e-3",
      status: "cancelled",
      requestedAt: "2026-10-14T10:00:00.000Z",
      reason: null,
    });
  });

  it("answers class.notFound for an unknown id", async () => {
    await expect(
      setup().useCase.execute({ actor: STUDENT, id: "5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25" }),
    ).rejects.toMatchObject({ constructor: NotFoundError, message: "class.notFound" });
  });

  it("answers class.notFound for a non-UUID without looking it up", async () => {
    const { reader, useCase } = setup();

    await expect(useCase.execute({ actor: STUDENT, id: "not-a-uuid" })).rejects.toMatchObject({
      constructor: NotFoundError,
      message: "class.notFound",
    });
    expect(reader.findByIdCalls).toEqual([]);
  });

  it("refuses a pending account", async () => {
    const { reader, useCase } = setup();

    await expect(
      useCase.execute({ actor: { ...STUDENT, status: "pending" }, id: ID }),
    ).rejects.toThrow(ForbiddenError);
    expect(reader.findByIdCalls).toEqual([]);
  });

  describe("pending requests", () => {
    function setupPending() {
      const reader = new FakeClassViewReader([
        buildClassView({ id: ID, instructors: [{ id: INSTRUCTOR.id, name: "Ana" }] }),
      ]);

      return new GetClass(
        reader,
        new FakeClassRosterReader(),
        new FakeViewerEnrolmentReader(),
        new FakePendingRequestCounter(3),
        new FakeClassContactReader(),
      );
    }

    it("counts them for an admin", async () => {
      const out = await setupPending().execute({ actor: ADMIN, id: ID });

      expect(out.pendingRequests).toBe(3);
    });

    it.each([["student", STUDENT], ["instructor", INSTRUCTOR]])("answers null for a %s", async (_, actor) => {
      const out = await setupPending().execute({ actor, id: ID });

      expect(out.pendingRequests).toBeNull();
    });
  });

  describe("contacts", () => {
    const SHARED = "s-shared";
    const HIDDEN = "s-hidden";
    const NO_NUMBER = "s-none";
    const REMOVED = "s-removed";
    const MISSING = "s-missing";
    const TEACHER = "i-admin";

    function contact(id: string, overrides: Partial<ClassContact> = {}): ClassContact {
      return {
        id,
        role: "student",
        status: "approved",
        whatsappNumber: `+55859${id.length}000000`,
        whatsappVisible: true,
        ...overrides,
      };
    }

    function setupContacts() {
      const reader = new FakeClassViewReader([
        buildClassView({ id: ID, instructors: [{ id: TEACHER, name: "Iara" }] }),
      ]);
      const students = [SHARED, HIDDEN, NO_NUMBER, REMOVED, MISSING].map((id) => ({
        id,
        name: id,
        photoUrl: null,
        enrolmentId: `e-${id}`,
      }));
      const contactReader = new FakeClassContactReader([
        contact(SHARED, { whatsappNumber: "+5585911111111" }),
        contact(HIDDEN, { whatsappNumber: "+5585922222222", whatsappVisible: false }),
        contact(NO_NUMBER, { whatsappNumber: null }),
        contact(REMOVED, { status: "removed", whatsappNumber: "+5585933333333" }),
        contact(TEACHER, { role: "admin", whatsappNumber: "+5585944444444", whatsappVisible: false }),
      ]);
      const useCase = new GetClass(
        reader,
        new FakeClassRosterReader({ [ID]: { students } }),
        new FakeViewerEnrolmentReader(),
        new FakePendingRequestCounter(),
        contactReader,
      );

      return { contactReader, useCase };
    }

    function numbers(out: { students: { id: string; whatsappNumber: string | null }[] }) {
      return Object.fromEntries(out.students.map((student) => [student.id, student.whatsappNumber]));
    }

    it.each([["student", STUDENT], ["instructor", INSTRUCTOR]])(
      "shows a %s only the numbers that are shared",
      async (_, actor) => {
        const out = await setupContacts().useCase.execute({ actor, id: ID });

        expect(numbers(out)).toEqual({
          [SHARED]: "+5585911111111",
          [HIDDEN]: null,
          [NO_NUMBER]: null,
          [REMOVED]: null,
          [MISSING]: null,
        });
        expect(out.instructors).toEqual([{ id: TEACHER, name: "Iara", role: "admin", whatsappNumber: null }]);
      },
    );

    it("shows an admin the hidden numbers too, but never a removed person's", async () => {
      const out = await setupContacts().useCase.execute({ actor: ADMIN, id: ID });

      expect(numbers(out)).toEqual({
        [SHARED]: "+5585911111111",
        [HIDDEN]: "+5585922222222",
        [NO_NUMBER]: null,
        [REMOVED]: null,
        [MISSING]: null,
      });
      expect(out.instructors).toEqual([
        { id: TEACHER, name: "Iara", role: "admin", whatsappNumber: "+5585944444444" },
      ]);
    });

    it("reads the students' and the instructors' contacts in one call", async () => {
      const { contactReader, useCase } = setupContacts();

      await useCase.execute({ actor: STUDENT, id: ID });

      expect(contactReader.calls).toEqual([[SHARED, HIDDEN, NO_NUMBER, REMOVED, MISSING, TEACHER]]);
    });

    it("answers an instructor missing from the contacts as an instructor without a number", async () => {
      const reader = new FakeClassViewReader([
        buildClassView({ id: ID, instructors: [{ id: "i-gone", name: "Rui" }] }),
      ]);
      const gone = await new GetClass(
        reader,
        new FakeClassRosterReader(),
        new FakeViewerEnrolmentReader(),
        new FakePendingRequestCounter(),
        new FakeClassContactReader(),
      ).execute({ actor: ADMIN, id: ID });

      expect(gone.instructors).toEqual([{ id: "i-gone", name: "Rui", role: "instructor", whatsappNumber: null }]);
    });
  });
});
