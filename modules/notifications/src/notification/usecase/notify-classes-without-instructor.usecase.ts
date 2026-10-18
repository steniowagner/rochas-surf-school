import { UseCase } from "@rochas-surf-school/shared";
import { RecipientsProvider } from "../provider";
import { Notify } from "./notify.usecase";

export interface NotifyClassesWithoutInstructorIn {
  /** How many classes were left with nobody to teach them. */
  count: number;
  /** The earliest of them. */
  classId: string;
  discipline: string;
  startsAt: Date;
  /** Admins who must not hear about it (the person who left, still approved while this runs). */
  excludeUserIds: string[];
}

/** Tells every approved admin, except the excluded ones, that classes were left without an instructor. */
export class NotifyClassesWithoutInstructor
  implements UseCase<NotifyClassesWithoutInstructorIn, void>
{
  constructor(
    private readonly recipientsProvider: RecipientsProvider,
    private readonly notify: Notify,
  ) {}

  async execute(input: NotifyClassesWithoutInstructorIn): Promise<void> {
    const excluded = new Set(input.excludeUserIds);
    const userIds = (await this.recipientsProvider.findApprovedAdminIds()).filter(
      (id) => !excluded.has(id),
    );
    if (userIds.length === 0) {
      return;
    }

    await this.notify.execute({
      userIds,
      type: "class.noInstructor",
      params: {
        count: input.count,
        classId: input.classId,
        discipline: input.discipline,
        startsAt: input.startsAt.toISOString(),
      },
    });
  }
}
