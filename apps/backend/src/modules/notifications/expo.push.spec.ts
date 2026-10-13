import { ConfigService } from '@nestjs/config';
import { PushMessage } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';

const expo = vi.hoisted(() => ({
  constructed: vi.fn(),
  send: vi.fn(),
  receipts: vi.fn(),
}));

vi.mock('expo-server-sdk', () => ({
  Expo: class {
    constructor(options: unknown) {
      expo.constructed(options);
    }
    chunkPushNotifications<T>(items: T[]): T[][] {
      return chunk(items, 2);
    }
    chunkPushNotificationReceiptIds<T>(items: T[]): T[][] {
      return chunk(items, 2);
    }
    sendPushNotificationsAsync = expo.send;
    getPushNotificationReceiptsAsync = expo.receipts;
  },
}));

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function message(token: string, overrides: Partial<PushMessage> = {}): PushMessage {
  return {
    token,
    locale: 'pt-BR',
    type: 'registration.pending',
    params: { name: 'Ana Souza' },
    notificationId: 'n1',
    ...overrides,
  };
}

function provider(env: Record<string, string> = {}) {
  return new ExpoPushProvider(new ConfigService(env));
}

describe('ExpoPushProvider', () => {
  beforeEach(() => {
    expo.constructed.mockReset();
    expo.send.mockReset().mockImplementation(async (messages: unknown[]) =>
      messages.map((_, index) => ({ status: 'ok', id: `id-${index}` })),
    );
    expo.receipts.mockReset();
  });

  it('draws each message in the device locale with the type and notification id as data', async () => {
    await provider().send([
      message('ExponentPushToken[a]'),
      message('ExponentPushToken[b]', { locale: 'en', type: 'registration.approved', params: {}, notificationId: 'n2' }),
    ]);

    expect(expo.send).toHaveBeenCalledWith([
      {
        to: 'ExponentPushToken[a]',
        title: 'Nova inscrição',
        body: 'Ana Souza está aguardando aprovação.',
        data: { type: 'registration.pending', notificationId: 'n1' },
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      },
      {
        to: 'ExponentPushToken[b]',
        title: 'Account approved',
        body: 'You can start using the app now.',
        data: { type: 'registration.approved', notificationId: 'n2' },
        sound: 'default',
        priority: 'high',
        channelId: 'default',
      },
    ]);
  });

  it('sends in chunks and returns the tickets in the order of the messages', async () => {
    expo.send
      .mockResolvedValueOnce([{ status: 'ok', id: 'k1' }, { status: 'ok', id: 'k2' }])
      .mockResolvedValueOnce([{ status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }]);

    const tickets = await provider().send([
      message('ExpoPushToken[1]'),
      message('ExpoPushToken[2]'),
      message('ExpoPushToken[3]'),
    ]);

    expect(expo.send).toHaveBeenCalledTimes(2);
    expect(tickets).toEqual([
      { status: 'ok', id: 'k1' },
      { status: 'ok', id: 'k2' },
      { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
    ]);
  });

  it('keeps sending the other chunks when one throws, then rethrows its error', async () => {
    expo.send
      .mockRejectedValueOnce(new Error('first chunk down'))
      .mockResolvedValueOnce([{ status: 'ok', id: 'k3' }])
      .mockRejectedValueOnce(new Error('third chunk down'));

    await expect(
      provider().send([
        message('ExpoPushToken[1]'),
        message('ExpoPushToken[2]'),
        message('ExpoPushToken[3]'),
        message('ExpoPushToken[4]'),
        message('ExpoPushToken[5]'),
      ]),
    ).rejects.toThrow('first chunk down');
    expect(expo.send).toHaveBeenCalledTimes(3);
  });

  it('passes the access token when set, and none otherwise', () => {
    provider({ EXPO_ACCESS_TOKEN: 'secret' });
    provider();

    expect(expo.constructed.mock.calls).toEqual([[{ accessToken: 'secret' }], [{}]]);
  });

  it('reads the receipts of every chunk of ids and merges them', async () => {
    expo.receipts
      .mockResolvedValueOnce({ k1: { status: 'ok' } })
      .mockResolvedValueOnce({ k3: { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } } });

    const receipts = await provider().getReceipts(['k1', 'k2', 'k3']);

    expect(expo.receipts.mock.calls).toEqual([[['k1', 'k2']], [['k3']]]);
    expect(receipts).toEqual({
      k1: { status: 'ok' },
      k3: { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
    });
  });

  it('fails when Expo fails while reading receipts', async () => {
    expo.receipts.mockRejectedValue(new Error('expo down'));

    await expect(provider().getReceipts(['k1'])).rejects.toThrow('expo down');
  });
});
