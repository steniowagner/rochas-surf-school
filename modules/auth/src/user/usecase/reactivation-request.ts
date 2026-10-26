import { ConflictError, NotFoundError } from "@rochas-surf-school/shared";
import { User } from "../model";
import { UserRepository } from "../provider";
import { UUID_PATTERN } from "./pending-registration";

export const REACTIVATION_NOT_REQUESTED = "reactivation.status.notRequested";

export async function findReactivationRequest(
  userRepository: UserRepository,
  userId: string,
): Promise<User> {
  if (!UUID_PATTERN.test(userId)) {
    throw new NotFoundError("reactivation.notFound");
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError("reactivation.notFound");
  }
  if (user.status !== "deleted" || user.reactivationStatus !== "requested") {
    throw new ConflictError(REACTIVATION_NOT_REQUESTED);
  }

  return user;
}
