import { SchoolRule } from "../model";

export interface SchoolRuleChange {
  save: SchoolRule[];
  delete: string[];
  bumpVersion: boolean;
}

export interface SchoolRuleRepository {
  findAll(): Promise<SchoolRule[]>;
  findById(id: string): Promise<SchoolRule | null>;
  getVersion(): Promise<number>;
  apply(change: SchoolRuleChange): Promise<number>;
}
