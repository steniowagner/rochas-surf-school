import { EmailProvider, SendSignInCodeIn } from "../../src";

export class FakeEmailProvider implements EmailProvider {
  readonly sent: SendSignInCodeIn[] = [];
  failing = false;

  async sendSignInCode(input: SendSignInCodeIn): Promise<void> {
    if (this.failing) {
      throw new Error("email provider unavailable");
    }
    this.sent.push(input);
  }
}
