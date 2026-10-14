export type PeopleRole = "student" | "instructor" | "admin";

/** One approved user, as `GET /people` answers it (`createdAt` an ISO 8601 string in UTC). */
export type Person = {
  id: string;
  name: string;
  role: PeopleRole;
  createdAt: string;
  /** E.164; `null` unless the owner shares it or the viewer is an admin. */
  whatsappNumber: string | null;
};

export type PeoplePage = {
  items: Person[];
  page: number;
  perPage: number;
  total: number;
};

export type PeopleFilters = {
  role: PeopleRole;
  search: string;
};
