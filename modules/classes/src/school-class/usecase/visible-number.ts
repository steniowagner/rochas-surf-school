import { ClassActor } from "../../access";
import { ClassContact } from "../provider";

/**
 * The directory's rule (`ListPeople`): an approved person's number, when they share it or the viewer is an
 * admin. A person missing from the contacts has none.
 */
export function visibleNumber(contact: ClassContact | undefined, actor: ClassActor): string | null {
  if (!contact || contact.status !== "approved" || !contact.whatsappNumber) return null;

  return contact.whatsappVisible || actor.role === "admin" ? contact.whatsappNumber : null;
}
