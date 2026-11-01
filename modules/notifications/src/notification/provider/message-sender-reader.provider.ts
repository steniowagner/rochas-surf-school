/** Who sent an admin's message, read from the account when the message is read. */
export interface MessageSender {
  id: string;
  name: string;
  photoUrl: string | null;
  role: string;
  status: string;
  whatsappNumber: string | null;
  whatsappVisible: boolean;
}

export interface MessageSenderReader {
  /** The accounts found among `ids`, by id; an erased or unknown one is left out. */
  findSenders(ids: string[]): Promise<Map<string, MessageSender>>;
}
