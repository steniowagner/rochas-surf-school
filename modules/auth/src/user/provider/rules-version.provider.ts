export interface RulesVersionProvider {
  /** The current version of the school rules; 0 until the first change. */
  getCurrentVersion(): Promise<number>;
}
