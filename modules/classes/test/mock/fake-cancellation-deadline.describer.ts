import {
  CancellationDeadlineDescriber,
  CancellationDeadlineDescription,
  CancellationDeadlineRequest,
} from "../../src";

type Answer =
  | CancellationDeadlineDescription
  | ((request: CancellationDeadlineRequest) => Promise<CancellationDeadlineDescription>);

export class FakeCancellationDeadlineDescriber implements CancellationDeadlineDescriber {
  readonly requests: CancellationDeadlineRequest[] = [];

  constructor(public answer: Answer = { kind: "minutesBefore", minutes: 720 }) {}

  async describe(request: CancellationDeadlineRequest): Promise<CancellationDeadlineDescription> {
    this.requests.push(request);

    return typeof this.answer === "function" ? this.answer(request) : this.answer;
  }
}
