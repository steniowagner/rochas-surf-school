import { User, UserRole, UserStatus } from "../model";

export interface AccountOut {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  whatsappNumber: string | null;
  whatsappVisible: boolean;
  rulesAccepted: boolean;
}

export function toAccountOut(user: User, currentRulesVersion: number): AccountOut {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    whatsappNumber: user.whatsappNumber ?? null,
    whatsappVisible: user.whatsappVisible,
    rulesAccepted: currentRulesVersion === 0 || user.hasAcceptedRules(currentRulesVersion),
  };
}
