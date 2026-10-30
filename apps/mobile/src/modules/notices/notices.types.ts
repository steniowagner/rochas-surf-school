import type { ClassSummary } from "@/modules/classes/components/class-summary-card/class-summary-card.types";
import type { ClassDetailsPerson } from "@/modules/classes/screens/class-details.screen.types";

/** Who a notice reaches; the backend keeps the same values (spec 063). */
export type NoticeAudience = "all" | "students" | "instructors";

/** What `GET /notifications/broadcast/recipients` answers. */
export type NoticeRecipientsCount = {
  count: number;
};

export type SendNoticeVariables = {
  audience: NoticeAudience;
  title: string;
  message: string;
};

/** The body of `POST /classes/:id/message` (spec 069). */
export type SendClassMessageVariables = {
  title: string;
  message: string;
};

/** The class a message goes to, as the Send notice screen shows it in its class mode (spec 069, D-09). */
export type ClassMessageView = ClassSummary & {
  /** "3 pessoas recebem". */
  title: string;
  /** "1 instrutor · 1 aluno · 1 pedido pendente". */
  summary: string;
  /** The instructors and the students with a seat who receive it, instructors first. */
  people: ClassMessagePerson[];
};

export type ClassMessagePerson = {
  id: string;
  /** The name, or "Former student" / "Former instructor". */
  label: string;
  erased: boolean;
  photoUrl: string | null;
  role: "instructor" | "student" | "pending";
  /** "Instrutor" / "Confirmado" / "Pedido pendente". */
  roleLabel: string;
  /** What the person sheet shows; `null` for an erased person, who has none to open. */
  sheetPerson: ClassDetailsPerson | null;
};

export type NoticeField = "title" | "message";
