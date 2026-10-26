import {
  ForbiddenError,
  InRule,
  RangeLengthRule,
  RequiredRule,
  Validator,
} from "@rochas-surf-school/shared";
import { BROADCAST_AUDIENCES } from "../provider";

export const BROADCAST_TITLE_MAX = 60;
export const BROADCAST_MESSAGE_MAX = 500;

export interface BroadcastActor {
  id: string;
  role: string;
  status: string;
}

export function assertCanBroadcast(actor: BroadcastActor): void {
  if (actor.status !== "approved") {
    throw new ForbiddenError("user.status.notApproved");
  }
  if (actor.role !== "admin") {
    throw new ForbiddenError("broadcast.role.notAdmin");
  }
}

export function normalizeBroadcastText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateAudience(audience: unknown): void {
  Validator.validate([
    {
      code: "broadcast.audience",
      value: audience,
      rules: [new RequiredRule(), new InRule(BROADCAST_AUDIENCES)],
    },
  ]);
}

export function validateBroadcastText(title: string, message: string): void {
  Validator.validate([
    {
      code: "broadcast.title",
      value: title,
      rules: [new RequiredRule(), new RangeLengthRule(1, BROADCAST_TITLE_MAX)],
    },
    {
      code: "broadcast.message",
      value: message,
      rules: [new RequiredRule(), new RangeLengthRule(1, BROADCAST_MESSAGE_MAX)],
    },
  ]);
}
