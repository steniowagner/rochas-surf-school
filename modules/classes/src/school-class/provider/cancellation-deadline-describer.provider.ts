import { CancellationDeadlineDescription, ClassDiscipline, ClassLevel } from "../model";

/** Everything the language model may see: the rule text and the class's details, never a person. */
export interface CancellationDeadlineRequest {
  rule: string;
  class: {
    discipline: ClassDiscipline;
    level: ClassLevel;
    /** `YYYY-MM-DD` in America/Fortaleza. */
    date: string;
    /** The English weekday name. */
    weekday: string;
    /** `HH:mm` in America/Fortaleza. */
    start: string;
    end: string;
    locationName: string;
    locationAddress: string;
    capacity: number;
    notes: string | null;
  };
}

export interface CancellationDeadlineDescriber {
  /** Describes the deadline the rule gives the class. Rejects, or answers `unclear`, when it can't. */
  describe(request: CancellationDeadlineRequest): Promise<CancellationDeadlineDescription>;
}
