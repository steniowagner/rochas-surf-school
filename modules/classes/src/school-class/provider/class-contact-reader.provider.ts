import { UserRole, UserStatus } from "@rochas-surf-school/auth";

/** What a class's details need to know to show a person's WhatsApp number. */
export interface ClassContact {
  id: string;
  role: UserRole;
  status: UserStatus;
  whatsappNumber: string | null;
  whatsappVisible: boolean;
}

export interface ClassContactReader {
  /** The contacts of the users that exist among `userIds`, by user id; the others are left out. */
  findContacts(userIds: string[]): Promise<Map<string, ClassContact>>;
}
