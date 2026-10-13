/**
 * Expo's ticket for a message that was accepted, kept until its receipt is checked. `id` is Expo's ticket id, and
 * `token` has no foreign key: the token may be deleted before the receipt arrives.
 */
export interface PushTicket {
  id: string;
  token: string;
  createdAt: Date;
}
