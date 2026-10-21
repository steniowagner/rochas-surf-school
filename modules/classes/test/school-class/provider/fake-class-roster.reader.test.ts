import { FakeClassRosterReader } from "../../mock";

const STUDENTS = ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase(), photoUrl: null, enrolmentId: `e-${id}` }));

describe("FakeClassRosterReader", () => {
  it("answers each known class with its seats and students in the given order", async () => {
    const reader = new FakeClassRosterReader({ c1: { students: STUDENTS } });

    const out = await reader.findRosters(["c1", "c2"]);

    expect(out.get("c1")).toEqual({ seatsTaken: 3, students: STUDENTS, guests: [] });
    expect(out.has("c2")).toBe(false);
  });

  it("caps the students but keeps the full count", async () => {
    const reader = new FakeClassRosterReader({ c1: { seatsTaken: 7, students: STUDENTS } });

    const out = await reader.findRosters(["c1"], 2);

    expect(out.get("c1")).toEqual({ seatsTaken: 7, students: STUDENTS.slice(0, 2), guests: [] });
  });

  it("counts the guests as seats and never caps them", async () => {
    const guests = [
      { id: "g1", name: "Carolina Reis" },
      { id: "g2", name: null },
    ];
    const reader = new FakeClassRosterReader({ c1: { students: STUDENTS, guests } });

    const out = await reader.findRosters(["c1"], 1);

    expect(out.get("c1")).toEqual({ seatsTaken: 5, students: STUDENTS.slice(0, 1), guests });
  });

  it("records the calls", async () => {
    const reader = new FakeClassRosterReader();

    await reader.findRosters(["x"], 4);

    expect(reader.calls).toEqual([{ classIds: ["x"], studentsLimit: 4 }]);
  });
});
