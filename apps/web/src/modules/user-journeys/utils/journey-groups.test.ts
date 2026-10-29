import { describe, expect, it } from "vitest";

import { es } from "../i18n/es";
import { buildJourneyGroups } from "./journey-groups";

describe("buildJourneyGroups", () => {
  it("pairs each group and row of the flow with its texts, in order", () => {
    const groups = buildJourneyGroups("auth", es);

    expect(groups.map((group) => group.title)).toEqual(["Entrada", "Email", "Aprobación y primeros pasos", "Cuenta cerrada"]);
    expect(groups.flatMap((group) => group.rows)).toHaveLength(19);
    expect(groups[0].rows[0]).toEqual({ id: "AU-01", designIds: ["AF-01-01", "AF-01-02"], ...es.rows["AU-01"] });
  });
});
