import { Entity, EntityState } from "@rochas-surf-school/shared";

export interface SchoolRuleState extends EntityState {}

export class SchoolRule extends Entity<SchoolRuleState> {
  constructor(props: SchoolRuleState) {
    super(props);
  }

  validate(): void {
    // Placeholder intencional para futuras validacoes do agregado.
  }
}
