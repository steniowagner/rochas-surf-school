import {
  ForbiddenError,
  RequiredRule,
  UnauthorizedError,
  UseCase,
  Validator,
} from "@rochas-surf-school/shared";
import { UserRole, UserStatus } from "../model";
import { UserRepository } from "../provider";

export interface SetWhatsappIn {
  userId: string;
  whatsappNumber: string;
  whatsappVisible: boolean;
}

export interface SetWhatsappOut {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  whatsappNumber: string | null;
  whatsappVisible: boolean;
}

export class SetWhatsapp implements UseCase<SetWhatsappIn, SetWhatsappOut> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: SetWhatsappIn): Promise<SetWhatsappOut> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UnauthorizedError("auth.token.invalid");
    }
    if (user.status !== "approved") {
      throw new ForbiddenError("user.status.notApproved");
    }

    Validator.validate([
      {
        code: "user.whatsappNumber",
        value: input.whatsappNumber,
        rules: [new RequiredRule()],
      },
    ]);

    const updated = user.clone({
      whatsappNumber: input.whatsappNumber,
      whatsappVisible: input.whatsappVisible,
    });
    updated.validate();
    await this.userRepository.update(updated);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      createdAt: updated.createdAt,
      whatsappNumber: input.whatsappNumber,
      whatsappVisible: updated.whatsappVisible,
    };
  }
}
