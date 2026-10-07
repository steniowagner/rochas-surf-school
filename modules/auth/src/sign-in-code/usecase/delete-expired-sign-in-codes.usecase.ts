import { UseCase } from "@rochas-surf-school/shared";
import { ClockProvider, SignInCodeRepository } from "../provider";

export interface DeleteExpiredSignInCodesOut {
  deleted: number;
}

export class DeleteExpiredSignInCodes
  implements UseCase<void, DeleteExpiredSignInCodesOut>
{
  constructor(
    private readonly signInCodeRepository: SignInCodeRepository,
    private readonly clock: ClockProvider,
  ) {}

  async execute(): Promise<DeleteExpiredSignInCodesOut> {
    const deleted = await this.signInCodeRepository.deleteExpired(this.clock.now());
    return { deleted };
  }
}
