import { ConflictError, NotFoundError } from "@rochas-surf-school/shared";
import { User } from "../model";
import { UserRepository } from "../provider";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const REGISTRATION_NOT_PENDING = "registration.status.notPending";

export async function findPendingRegistration(
  userRepository: UserRepository,
  registrationId: string,
): Promise<User> {
  if (!UUID_PATTERN.test(registrationId)) {
    throw new NotFoundError("registration.notFound");
  }

  const user = await userRepository.findById(registrationId);
  if (!user) {
    throw new NotFoundError("registration.notFound");
  }
  if (user.status !== "pending") {
    throw new ConflictError(REGISTRATION_NOT_PENDING);
  }

  return user;
}
