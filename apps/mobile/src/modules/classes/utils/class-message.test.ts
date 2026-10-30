import { classMessageRecipients } from "./class-message";

const person = (id: string) => ({ id, name: id, photoUrl: null, role: "instructor" as const, whatsappNumber: null });
const student = (id: string) => ({ id, name: id, photoUrl: null, enrolmentId: `e-${id}`, whatsappNumber: null });

describe("classMessageRecipients", () => {
  it("counts the instructors, the students with a seat and the pending requests", () => {
    const recipients = classMessageRecipients(
      { instructors: [person("i-1")], students: [student("s-1"), student("s-2")], pendingRequests: 3 },
      "admin",
    );

    expect(recipients.instructors.map((item) => item.id)).toEqual(["i-1"]);
    expect(recipients.students.map((item) => item.id)).toEqual(["s-1", "s-2"]);
    expect(recipients).toMatchObject({ pendingCount: 3, count: 6 });
  });

  it("leaves out the admin who sends it, as an instructor and as a student", () => {
    const recipients = classMessageRecipients(
      { instructors: [person("admin"), person("i-1")], students: [student("admin")], pendingRequests: 0 },
      "admin",
    );

    expect(recipients.instructors.map((item) => item.id)).toEqual(["i-1"]);
    expect(recipients.students).toEqual([]);
    expect(recipients.count).toBe(1);
  });

  it("counts a person who teaches the class and holds a seat once, as an instructor", () => {
    const recipients = classMessageRecipients(
      { instructors: [person("i-1")], students: [student("i-1"), student("s-1")], pendingRequests: null },
      "admin",
    );

    expect(recipients.students.map((item) => item.id)).toEqual(["s-1"]);
    expect(recipients).toMatchObject({ pendingCount: 0, count: 2 });
  });

  it("has nobody to tell when the sender teaches alone", () => {
    expect(
      classMessageRecipients({ instructors: [person("admin")], students: [] }, "admin").count,
    ).toBe(0);
  });
});
