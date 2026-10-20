export type UseContactSchoolButtonResult = {
  /** The school has a WhatsApp number to chat with. */
  hasNumber: boolean;
  openChat: () => Promise<void>;
};
