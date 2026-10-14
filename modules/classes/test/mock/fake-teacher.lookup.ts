import { TeacherLookup, TeacherRef } from "../../src";

export class FakeTeacherLookup implements TeacherLookup {
  constructor(private readonly teachers: TeacherRef[] = []) {}

  async findTeachers(ids: string[]): Promise<TeacherRef[]> {
    return this.teachers.filter((item) => ids.includes(item.id));
  }
}
