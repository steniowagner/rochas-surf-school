import { Person } from "../../people.types";

export type PersonSheetProps = {
  /** Kept while the sheet slides away, so its content doesn't vanish before it is gone. */
  person: Pick<Person, "name" | "role" | "whatsappNumber"> | null;
  /** When given, an email row replaces the WhatsApp row. */
  email?: string;
  visible: boolean;
  onClose: () => void;
};

export type UsePersonSheetProps = Pick<PersonSheetProps, "person">;
