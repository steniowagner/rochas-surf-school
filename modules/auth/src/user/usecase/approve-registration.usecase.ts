import { ConflictError, UseCase } from "@rochas-surf-school/shared";
import { UserStatus } from "../model";
import { RegistrationNotifier, UserRepository } from "../provider";
import {
  findPendingRegistration,
  REGISTRATION_NOT_PENDING,
} from "./pending-registration";
import {
  assertCanDecideRegistrations,
  RegistrationActor,
} from "./registration-access";

export interface ApproveRegistrationIn {
  actor: RegistrationActor;
  registrationId: string;
}

export interface ApproveRegistrationOut {
  id: string;
  status: UserStatus;
}

export class ApproveRegistration implements UseCase<
  ApproveRegistrationIn,
  ApproveRegistrationOut
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly registrationNotifier: RegistrationNotifier,
  ) {}

  async execute(input: ApproveRegistrationIn): Promise<ApproveRegistrationOut> {
    assertCanDecideRegistrations(input.actor);

    const user = await findPendingRegistration(
      this.userRepository,
      input.registrationId,
    );

    const approved = user.clone({ status: "approved" });
    approved.validate();

    if (!(await this.userRepository.updateIfPending(approved))) {
      throw new ConflictError(REGISTRATION_NOT_PENDING);
    }

    await this.registrationNotifier.registrationApproved(approved.id);

    return { id: approved.id, status: approved.status };
  }
}
