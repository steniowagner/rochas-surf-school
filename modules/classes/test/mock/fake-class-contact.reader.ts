import { ClassContact, ClassContactReader } from "../../src";

export class FakeClassContactReader implements ClassContactReader {
  readonly calls: string[][] = [];

  constructor(private readonly contacts: ClassContact[] = []) {}

  async findContacts(userIds: string[]): Promise<Map<string, ClassContact>> {
    this.calls.push(userIds);

    return new Map(
      this.contacts.filter((contact) => userIds.includes(contact.id)).map((contact) => [contact.id, { ...contact }]),
    );
  }
}
