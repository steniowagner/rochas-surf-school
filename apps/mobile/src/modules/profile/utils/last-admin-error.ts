import { ApiError } from "@/services/api";

/** `DELETE /auth/me` refused the school's only approved admin (spec 058, D-01). */
export const isLastAdminError = (error: unknown): boolean =>
  error instanceof ApiError && error.status === 409 && error.errors[0] === "user.role.lastAdmin";
