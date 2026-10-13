import { CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { ExpoPushProvider } from './expo.push.js';
import { PushReceiptCheckJob } from './push-receipt-check.job.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-12T12:00:00.000Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000);

function setup() {
  const pushTicketRepository = {
    findCreatedBefore: vi.fn().mockResolvedValue([]),
    deleteByIds: vi.fn(),
  };
  const pushTokenRepository = { deleteByTokens: vi.fn() };
  const pushProvider = { getReceipts: vi.fn().mockResolvedValue({}) };
  const job = new PushReceiptCheckJob(
    pushTicketRepository as unknown as PrismaPushTicketRepository,
    pushTokenRepository as unknown as PrismaPushTokenRepository,
    pushProvider as unknown as ExpoPushProvider,
    { now: () => NOW } as SystemClockProvider,
  );
  return { job, pushTicketRepository, pushTokenRepository, pushProvider };
}

describe('PushReceiptCheckJob', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs every minute', () => {
    const handler = Object.getOwnPropertyDescriptor(PushReceiptCheckJob.prototype, 'run')!
      .value as object;

    expect(Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', handler)).toMatchObject({
      cronTime: CronExpression.EVERY_MINUTE,
    });
  });

  it('asks for the tickets 15 minutes old, deletes the dead token and the tickets', async () => {
    const { job, pushTicketRepository, pushTokenRepository, pushProvider } = setup();
    pushTicketRepository.findCreatedBefore.mockResolvedValue([
      { id: 'k1', token: 'ExpoPushToken[a]', createdAt: minutesAgo(16) },
    ]);
    pushProvider.getReceipts.mockResolvedValue({
      k1: { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
    });

    await job.run();

    expect(pushTicketRepository.findCreatedBefore).toHaveBeenCalledWith(minutesAgo(15));
    expect(pushProvider.getReceipts).toHaveBeenCalledWith(['k1']);
    expect(pushTokenRepository.deleteByTokens).toHaveBeenCalledWith(['ExpoPushToken[a]']);
    expect(pushTicketRepository.deleteByIds).toHaveBeenCalledWith(['k1']);
  });

  it("doesn't call Expo with nothing due", async () => {
    const { job, pushProvider } = setup();

    await job.run();

    expect(pushProvider.getReceipts).not.toHaveBeenCalled();
  });

  it('logs an error instead of throwing, whatever was thrown', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { job, pushTicketRepository } = setup();

    pushTicketRepository.findCreatedBefore.mockRejectedValueOnce(new Error('db down'));
    await expect(job.run()).resolves.toBeUndefined();
    pushTicketRepository.findCreatedBefore.mockRejectedValueOnce('boom');
    await expect(job.run()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledTimes(2);
    expect(error.mock.calls[1]![1]).toBe('boom');
  });
});
