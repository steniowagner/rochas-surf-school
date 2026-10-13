/** Removes a device's push token; implemented by the backend module that owns notifications. */
export interface PushTokenRemover {
  /** Deletes the token only when it belongs to the user. */
  remove(userId: string, token: string): Promise<void>;
}
