import { describe, expect, it } from "vitest";

import { adminAppIds } from "@/modules/designs/data/admin-app-ids";
import { authFlowIds } from "@/modules/designs/data/auth-flow-ids";
import { instructorAppIds } from "@/modules/designs/data/instructor-app-ids";
import { studentAppIds } from "@/modules/designs/data/student-app-ids";

import { designPageOf } from "../utils/design-href";
import { flowRows, isUserJourneyFlowSlug, userJourneyFlowSlugs, userJourneyFlows } from "./user-journey-flows";

const idsByPage: Record<string, readonly string[]> = {
  "auth-flow": authFlowIds,
  "student-app": studentAppIds,
  "instructor-app": instructorAppIds,
  "admin-app": adminAppIds,
};

const expected = {
  auth: { prefix: "AU", count: 19, groups: 4, designPage: "auth-flow" },
  student: { prefix: "ST", count: 28, groups: 6, designPage: "student-app" },
  instructor: { prefix: "IN", count: 16, groups: 6, designPage: "instructor-app" },
  admin: { prefix: "AD", count: 33, groups: 8, designPage: "admin-app" },
} as const;

describe("userJourneyFlows", () => {
  it("lists the four flows in order", () => {
    expect(userJourneyFlowSlugs).toEqual(["auth", "student", "instructor", "admin"]);
    expect(Object.keys(userJourneyFlows).sort()).toEqual([...userJourneyFlowSlugs].sort());
  });

  it.each(userJourneyFlowSlugs)("numbers the %s rows sequentially, with the expected count and groups", (flow) => {
    const { prefix, count, groups, designPage } = expected[flow];
    const ids = flowRows(flow).map((row) => row.id);

    expect(ids).toHaveLength(count);
    expect(ids).toEqual(Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(2, "0")}`));
    expect(userJourneyFlows[flow].groups).toHaveLength(groups);
    expect(userJourneyFlows[flow].designPage).toBe(designPage);
    for (const group of userJourneyFlows[flow].groups) {
      expect(group.rows.length).toBeGreaterThan(0);
    }
  });

  it("uses every row id and group key once", () => {
    const ids = userJourneyFlowSlugs.flatMap((flow) => flowRows(flow).map((row) => row.id));

    expect(new Set(ids).size).toBe(ids.length);
    for (const flow of userJourneyFlowSlugs) {
      const keys = userJourneyFlows[flow].groups.map((group) => group.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("every design id exists in its page's inventory", () => {
    for (const flow of userJourneyFlowSlugs) {
      for (const row of flowRows(flow)) {
        for (const designId of row.designIds) {
          expect(idsByPage[designPageOf(designId)], `${row.id} → ${designId}`).toContain(designId);
        }
      }
    }
  });

  it("keeps a row's design links on its flow's page, except AU-17's student frame", () => {
    const crossPage = userJourneyFlowSlugs.flatMap((flow) =>
      flowRows(flow).flatMap((row) =>
        row.designIds
          .filter((designId) => designPageOf(designId) !== userJourneyFlows[flow].designPage)
          .map((designId) => `${row.id}:${designId}`),
      ),
    );

    expect(crossPage).toEqual(["AU-17:ST-05-07"]);
  });

  it("leaves AU-15 without a design", () => {
    expect(flowRows("auth").find((row) => row.id === "AU-15")?.designIds).toEqual([]);
  });

  it("recognises the flow slugs only", () => {
    expect(isUserJourneyFlowSlug("student")).toBe(true);
    expect(isUserJourneyFlowSlug("design-system")).toBe(false);
  });
});
