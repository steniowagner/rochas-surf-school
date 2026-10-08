// English (US) is the source of truth for the message keys; the other locales are typed against it.
const messages = {
  language: {
    button: "Language",
    title: "Language",
    description: "Choose the app language.",
  },
  common: {
    close: "Close",
    back: "Back",
  },
  auth: {
    continueWithApple: "Continue with Apple",
    continueWithGoogle: "Continue with Google",
    continueWithEmail: "Continue with email",
    terms:
      "By continuing, you agree to our <terms>Terms of Use</terms> and <privacy>Privacy Policy</privacy>.",
  },
};

export type Messages = typeof messages;

export default messages;
