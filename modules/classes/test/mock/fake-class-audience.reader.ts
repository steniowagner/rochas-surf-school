import { ClassAudienceReader, LocationAudienceMember } from "../../src";

export class FakeClassAudienceReader implements ClassAudienceReader {
  readonly locationCalls: { locationId: string; now: Date }[] = [];
  fail = false;

  constructor(
    private readonly classes: Record<string, string[]> = {},
    private readonly locations: Record<string, LocationAudienceMember[]> = {},
  ) {}

  async findClassAudience(classId: string): Promise<string[]> {
    if (this.fail) throw new Error("audience reader failed");

    return this.classes[classId] ?? [];
  }

  async findLocationAudience(locationId: string, now: Date): Promise<LocationAudienceMember[]> {
    if (this.fail) throw new Error("audience reader failed");

    this.locationCalls.push({ locationId, now });

    return this.locations[locationId] ?? [];
  }
}
