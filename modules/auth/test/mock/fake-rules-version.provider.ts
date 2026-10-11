import { RulesVersionProvider } from "../../src";

export class FakeRulesVersionProvider implements RulesVersionProvider {
  constructor(private version = 0) {}

  async getCurrentVersion(): Promise<number> {
    return this.version;
  }

  set(version: number): void {
    this.version = version;
  }
}
