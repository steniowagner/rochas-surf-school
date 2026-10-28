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
export type ClassMessageView = {
  /** "Surf Iniciante". */
  name: string;
  /** "Amanhã · 08:00 – 09:00". */
  when: string;
  locationName: string;
  /** The people who receive it, by group; a group with nobody isn't listed. */
  groups: { key: "instructors" | "students"; label: string; names: string[] }[];
  /** "+ 2 pedidos pendentes", or `null` without any. */
  pendingLine: string | null;
};

export type NoticeField = "title" | "message";
