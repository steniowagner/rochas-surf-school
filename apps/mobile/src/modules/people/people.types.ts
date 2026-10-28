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

/** A role change an admin can start from a person's sheet (spec 058, D-12). */
export type RoleAction =
  | "promoteInstructor"
  | "promoteAdmin"
  | "demoteStudent"
  | "adminToInstructor";

/** One removed account inside its 30-day window, as `GET /people/removed` answers it (`removedAt` an ISO 8601 string). */
export type RemovedAccount = {
  id: string;
  name: string;
  role: PeopleRole;
  /** E.164; an admin always gets it, whether or not the owner shares it. */
  whatsappNumber: string | null;
  removedAt: string;
};

/** What `GET /people/removed` answers. */
export type RemovedAccountsResponse = {
  items: RemovedAccount[];
};

/** What `POST /people/:id/remove` and `POST /people/:id/restore` answer. */
export type AccountStatusChange = {
  id: string;
  status: "removed" | "approved";
};
