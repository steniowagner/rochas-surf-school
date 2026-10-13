import { CheckPushReceipts } from "../../../src";
import {
  FakeClockProvider,
  FakePushProvider,
  FakePushTicketRepository,
  FakePushTokenRepository,
  minutesAgo,
  NOW,
  pushTicket,
  pushToken,
} from "../../mock";

function setup(tickets = [
  pushTicket("k1", "ExpoPushToken[t1]", minutesAgo(16)),
  pushTicket("k2", "ExpoPushToken[t2]", minutesAgo(5)),
]) {
  const ticketRepository = new FakePushTicketRepository(tickets);
  const tokenRepository = new FakePushTokenRepository([
    pushToken("ExpoPushToken[t1]"),
    pushToken("ExpoPushToken[t2]"),
  ]);
  const provider = new FakePushProvider();
  const usecase = new CheckPushReceipts(
    ticketRepository,
    tokenRepository,
    provider,
    new FakeClockProvider(NOW),
  );
  return { ticketRepository, tokenRepository, provider, usecase };
}

const NOT_REGISTERED = { status: "error" as const, details: { error: "DeviceNotRegistered" } };

describe("CheckPushReceipts", () => {
  it("asks only for tickets 15 minutes old and removes the dead token", async () => {
    const { ticketRepository, tokenRepository, provider, usecase } = setup();
    provider.receipts = { k1: NOT_REGISTERED };

    await usecase.execute();

    expect(provider.receiptRequests).toEqual([["k1"]]);
    expect(tokenRepository.tokens()).toEqual(["ExpoPushToken[t2]"]);
    expect(ticketRepository.ids()).toEqual(["k2"]);
  });

  it("asks about a ticket of exactly 15 minutes", async () => {
    const { provider, usecase } = setup([pushTicket("k1", "ExpoPushToken[t1]", minutesAgo(15))]);

    await usecase.execute();

    expect(provider.receiptRequests).toEqual([["k1"]]);
  });

  it.each([
    ["an ok receipt", { k1: { status: "ok" as const } }],
    ["another error", { k1: { status: "error" as const, details: { error: "MessageTooBig" } } }],
    ["an error without details", { k1: { status: "error" as const } }],
    ["no receipt", {}],
  ])("deletes the ticket and keeps the token on %s", async (_name, receipts) => {
    const { ticketRepository, tokenRepository, provider, usecase } = setup();
    provider.receipts = receipts;

    await usecase.execute();

    expect(ticketRepository.ids()).toEqual(["k2"]);
    expect(tokenRepository.tokens()).toHaveLength(2);
  });

  it("deletes a ticket older than 24 hours without asking Expo", async () => {
    const { ticketRepository, tokenRepository, provider, usecase } = setup([
      pushTicket("old", "ExpoPushToken[t1]", minutesAgo(25 * 60)),
    ]);
    provider.receipts = { old: NOT_REGISTERED };

    await usecase.execute();

    expect(provider.receiptRequests).toEqual([]);
    expect(ticketRepository.ids()).toEqual([]);
    expect(tokenRepository.tokens()).toHaveLength(2);
  });

  it("asks only for the fresh ones when stale and due tickets mix", async () => {
    const { ticketRepository, provider, usecase } = setup([
      pushTicket("old", "ExpoPushToken[t1]", minutesAgo(25 * 60)),
      pushTicket("k1", "ExpoPushToken[t1]", minutesAgo(20)),
    ]);

    await usecase.execute();

    expect(provider.receiptRequests).toEqual([["k1"]]);
    expect(ticketRepository.ids()).toEqual([]);
  });

  it("doesn't call Expo with nothing due, and a second run asks nothing", async () => {
    const { provider, usecase } = setup();

    await usecase.execute();
    await usecase.execute();

    expect(provider.receiptRequests).toEqual([["k1"]]);
  });

  it("keeps the tickets when Expo fails, so the next run asks again", async () => {
    const { ticketRepository, provider, usecase } = setup();
    provider.receiptsError = new Error("expo down");

    await expect(usecase.execute()).rejects.toThrow("expo down");
    expect(ticketRepository.ids()).toEqual(["k1", "k2"]);
  });
});
