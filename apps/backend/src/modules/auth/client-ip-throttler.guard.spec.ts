import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ClientIpThrottlerGuard } from './client-ip-throttler.guard.js';

async function trackerOf(clientIpHeader: string | undefined, req: Record<string, unknown>): Promise<string> {
  const config = { get: vi.fn(() => clientIpHeader) } as unknown as ConfigService;
  const guard = new ClientIpThrottlerGuard(
    { throttlers: [] },
    {} as ThrottlerStorage,
    new Reflector(),
    config,
  );
  await guard.onModuleInit();
  return (guard as unknown as { getTracker(req: object): Promise<string> }).getTracker(req);
}

describe('ClientIpThrottlerGuard', () => {
  it('tracks the value of CLIENT_IP_HEADER when it is set', async () => {
    const tracker = await trackerOf('x-client-ip', {
      ip: '10.0.0.1',
      headers: { 'x-client-ip': '203.0.113.7' },
    });

    expect(tracker).toBe('203.0.113.7');
  });

  it('reads the header whatever the case CLIENT_IP_HEADER is written in', async () => {
    const tracker = await trackerOf('X-Client-IP', {
      ip: '10.0.0.1',
      headers: { 'x-client-ip': '203.0.113.7' },
    });

    expect(tracker).toBe('203.0.113.7');
  });

  it('falls back to the plain IP when the header is missing', async () => {
    const tracker = await trackerOf('x-client-ip', { ip: '10.0.0.1', headers: {} });

    expect(tracker).toBe('10.0.0.1');
  });

  it('ignores the header when CLIENT_IP_HEADER is unset', async () => {
    const tracker = await trackerOf(undefined, {
      ip: '10.0.0.1',
      headers: { 'x-client-ip': '203.0.113.7' },
    });

    expect(tracker).toBe('10.0.0.1');
  });
});
