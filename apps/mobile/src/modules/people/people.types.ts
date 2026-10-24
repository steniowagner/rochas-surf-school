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
  /** Users with at least one of these roles; none selected means everyone. */
  roles: PeopleRole[];
  search: string;
};

/** What `PUT /people/:id/role` takes: whose role and the new one. */
export type ChangeRoleVariables = {
  id: string;
  role: PeopleRole;
};

/** What `PUT /people/:id/role` answers. */
export type RoleChange = {
  id: string;
  role: PeopleRole;
};
