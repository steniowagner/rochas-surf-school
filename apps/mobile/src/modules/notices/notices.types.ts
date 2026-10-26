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

export type NoticeField = "title" | "message";
