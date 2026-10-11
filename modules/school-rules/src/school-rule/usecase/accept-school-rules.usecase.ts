import {
  ConflictError,
  ForbiddenError,
  IntegerRule,
  RequiredRule,
  UnauthorizedError,
  UseCase,
  ValidationError,
  ValidationException,
  Validator,
} from "@rochas-surf-school/shared";
import {
  AccountOut,
  ClockProvider,
  UserRepository,
  toAccountOut,
} from "@rochas-surf-school/auth";
import { SchoolRuleRepository } from "../provider";
import { SchoolRuleActor } from "./school-rule-access";

export interface AcceptSchoolRulesIn {
  actor: SchoolRuleActor;
  version: unknown;
}

export class AcceptSchoolRules
  implements UseCase<AcceptSchoolRulesIn, AccountOut>
{
  constructor(
    private readonly schoolRuleRepository: SchoolRuleRepository,
    private readonly userRepository: UserRepository,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: AcceptSchoolRulesIn): Promise<AccountOut> {
    const user = await this.userRepository.findById(input.actor.id);
    if (!user) {
      throw new UnauthorizedError("auth.token.invalid");
    }
    if (user.status !== "approved") {
      throw new ForbiddenError("user.status.notApproved");
    }

    // A list would pass the rules below, which look at each item of one.
    const version = Array.isArray(input.version) ? Number.NaN : input.version;
    Validator.validate([
      {
        code: "schoolRules.version",
        value: version,
        rules: [new RequiredRule(), new IntegerRule()],
      },
    ]);

    const currentVersion = await this.schoolRuleRepository.getVersion();
    if (currentVersion === 0) {
      throw new ValidationException([
        new ValidationError("schoolRules.version.nothingToAccept"),
      ]);
    }
    if (version !== currentVersion) {
      throw new ConflictError("schoolRules.version.outdated", { currentVersion });
    }

    if (user.hasAcceptedRules(currentVersion)) {
      return toAccountOut(user, currentVersion);
    }

    await this.userRepository.addRulesAcceptance(user.id, {
      version: currentVersion,
      acceptedAt: this.clock.now(),
    });
    const updated = (await this.userRepository.findById(user.id)) ?? user;

    return toAccountOut(updated, currentVersion);
  }
}
