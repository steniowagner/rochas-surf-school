import { CrudRepository } from "@rochas-surf-school/shared";
import { SchoolRule } from "../model";

export interface SchoolRulePageParams {
  page: number;
  perPage: number;
}

export interface SchoolRuleRepository extends CrudRepository<
  SchoolRule,
  SchoolRule,
  SchoolRule,
  SchoolRulePageParams
> {}
