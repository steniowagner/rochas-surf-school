import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PushMessage,
  PushProvider,
  PushReceipt,
  PushSendTicket,
} from '@rochas-surf-school/notifications';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { renderPush } from './push-messages.js';

@Injectable()
export class ExpoPushProvider implements PushProvider {
  private readonly expo: Expo;

  constructor(configService: ConfigService) {
    const accessToken = configService.get<string>('EXPO_ACCESS_TOKEN');
    this.expo = new Expo(accessToken ? { accessToken } : {});
  }

  /**
   * Sends every message in chunks; the tickets come back in the order of the messages. A chunk whose request throws
   * stores no tickets for its messages, the other chunks are still sent, and the first error is rethrown at the end.
   */
  async send(messages: PushMessage[]): Promise<PushSendTicket[]> {
    const expoMessages = messages.map((message) => this.toExpoMessage(message));
    const tickets: PushSendTicket[] = [];
    let failure: unknown;
    let failed = false;

    for (const chunk of this.expo.chunkPushNotifications(expoMessages)) {
      try {
        tickets.push(...(await this.expo.sendPushNotificationsAsync(chunk)));
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
        }
      }
    }

    if (failed) {
      throw failure;
    }
    return tickets;
  }

  async getReceipts(ticketIds: string[]): Promise<Record<string, PushReceipt>> {
    const receipts: Record<string, PushReceipt> = {};
    for (const chunk of this.expo.chunkPushNotificationReceiptIds(ticketIds)) {
      Object.assign(receipts, await this.expo.getPushNotificationReceiptsAsync(chunk));
    }
    return receipts;
  }

  private toExpoMessage(message: PushMessage): ExpoPushMessage {
    const { title, body } = renderPush(message.type, message.params, message.locale);
    return {
      to: message.token,
      title,
      body,
      data: { type: message.type, notificationId: message.notificationId },
      sound: 'default',
      priority: 'high',
      channelId: 'default',
    };
  }
}
