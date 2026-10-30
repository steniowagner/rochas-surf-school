import { Person } from "../../people.types";

export type PersonSheetProps = {
  /**
   * Kept while the sheet slides away, so its content doesn't vanish before it is gone. The id is needed only for
   * the role actions.
   */
  person: (Pick<Person, "name" | "photoUrl" | "role" | "whatsappNumber"> & Partial<Pick<Person, "id" | "isInstructor">>) | null;
  /** When given, an email row replaces the WhatsApp row. */
  email?: string;
  /** Shows the role actions below the contact row (spec 058, D-04): only the People screen sets it. */
  canChangeRole?: boolean;
  /** Shows the "Também é instrutor" row (spec 070, D-09): an approved admin viewing an admin, themselves included. */
  canSetInstructorFlag?: boolean;
  visible: boolean;
  onClose: () => void;
};

export type UsePersonSheetProps = Pick<PersonSheetProps, "person" | "onClose">;
