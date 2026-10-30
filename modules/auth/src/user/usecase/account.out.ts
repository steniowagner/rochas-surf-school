import { User, UserReactivationStatus, UserRole, UserStatus } from "../model";

export interface AccountOut {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  photoUrl: string | null;
  whatsappNumber: string | null;
  whatsappVisible: boolean;
  rulesAccepted: boolean;
  rulesAcceptedBefore: boolean;
  denialReason: string | null;
  reactivationStatus: UserReactivationStatus | null;
}

export function toAccountOut(user: User, currentRulesVersion: number): AccountOut {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    photoUrl: user.photoUrl ?? null,
    whatsappNumber: user.whatsappNumber ?? null,
    whatsappVisible: user.whatsappVisible,
    rulesAccepted: currentRulesVersion === 0 || user.hasAcceptedRules(currentRulesVersion),
    rulesAcceptedBefore: user.rulesAcceptances.length > 0,
    denialReason: user.denialReason ?? null,
    reactivationStatus: user.reactivationStatus ?? null,
  };
}
