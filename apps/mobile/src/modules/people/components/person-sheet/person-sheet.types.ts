import { Person } from "../../people.types";

export type PersonSheetProps = {
  /**
   * Kept while the sheet slides away, so its content doesn't vanish before it is gone. The id is needed only for
   * the role actions.
   */
  person: (Pick<Person, "name" | "role" | "whatsappNumber"> & Partial<Pick<Person, "id">>) | null;
  /** When given, an email row replaces the WhatsApp row. */
  email?: string;
  /** Shows the role actions below the contact row (spec 058, D-04): only the People screen sets it. */
  canChangeRole?: boolean;
  visible: boolean;
  onClose: () => void;
};

export type UsePersonSheetProps = Pick<PersonSheetProps, "person" | "onClose">;
