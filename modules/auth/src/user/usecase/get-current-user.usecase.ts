import { UnauthorizedError, UseCase } from "@rochas-surf-school/shared";
import { UserRole, UserStatus } from "../model";
import { UserRepository } from "../provider";

export interface GetCurrentUserIn {
  id: string;
}

export interface GetCurrentUserOut {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
}

export class GetCurrentUser
  implements UseCase<GetCurrentUserIn, GetCurrentUserOut>
{
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: GetCurrentUserIn): Promise<GetCurrentUserOut> {
    const user = await this.userRepository.findById(input.id);
    if (!user) {
      throw new UnauthorizedError("auth.token.invalid");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
