import { ClassReminder, ClassReminderNotifier } from "../../src";

export class FakeClassReminderNotifier implements ClassReminderNotifier {
  readonly reminders: ClassReminder[] = [];
  fail = false;

  async classReminder(event: ClassReminder): Promise<void> {
    this.reminders.push(event);

    if (this.fail) {
      throw new Error("notifier down");
    }
  }
}
