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
  createAccount: {
    title: "Create account",
    subtitle: "Tell us your name and email. We'll send you a code to confirm.",
    namePlaceholder: "First and last name",
    emailPlaceholder: "you@email.com",
    submit: "Get code",
    nameInvalid: "Enter your first and last name.",
    emailInvalid: "Enter a valid email.",
  },
};

export type Messages = typeof messages;

export default messages;
