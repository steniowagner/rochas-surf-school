import { SystemClockProvider } from './system.clock.js';

describe('SystemClockProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the current time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00.000Z'));

    expect(new SystemClockProvider().now()).toEqual(new Date('2026-10-07T12:00:00.000Z'));
  });
});
