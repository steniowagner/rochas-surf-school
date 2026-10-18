import { CLASS_DISCIPLINES } from "../../school-class/model/class-limits";
import { CancellationRule } from "../model";

export interface CancellationRulesOut {
  surf: string | null;
  skate: string | null;
}

export function toCancellationRulesOut(rules: CancellationRule[]): CancellationRulesOut {
  const out: CancellationRulesOut = { surf: null, skate: null };

  for (const discipline of CLASS_DISCIPLINES) {
    out[discipline] = rules.find((rule) => rule.discipline === discipline)?.text ?? null;
  }

  return out;
}
