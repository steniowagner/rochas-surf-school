import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  UseCase,
} from "@rochas-surf-school/shared";
import { ClockProvider } from "../../sign-in-code/provider";
import { ReactivationNotifier, RulesVersionProvider, UserRepository } from "../provider";
import { AccountOut, toAccountOut } from "./account.out";

export interface RequestReactivationIn {
  userId: string;
}

export type RequestReactivationOut = AccountOut;

export class RequestReactivation
  implements UseCase<RequestReactivationIn, RequestReactivationOut>
{
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rulesVersionProvider: RulesVersionProvider,
    private readonly clock: ClockProvider,
    private readonly reactivationNotifier: ReactivationNotifier,
  ) {}

  async execute(input: RequestReactivationIn): Promise<RequestReactivationOut> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UnauthorizedError("auth.token.invalid");
    }
    if (user.status !== "deleted") {
      throw new ForbiddenError("user.status.notDeleted");
    }
    if (user.reactivationStatus === "denied") {
      throw new ConflictError("user.reactivation.denied");
    }

    let account = user;
    if (user.reactivationStatus !== "requested") {
      account = user.clone({
        reactivationStatus: "requested",
        reactivationRequestedAt: this.clock.now(),
      });
      account.validate();
      await this.userRepository.update(account);
      await this.reactivationNotifier.reactivationRequested({ id: account.id, name: account.name });
    }

    return toAccountOut(account, await this.rulesVersionProvider.getCurrentVersion());
  }
}
