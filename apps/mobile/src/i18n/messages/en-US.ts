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
    errors: {
      invalidEmail: "That email doesn't look right. Check it and try again.",
      tooManyAttempts: "Too many attempts. Wait a minute and try again.",
      sendFailed: "We couldn't send the email. Please try again.",
      noConnection: "No connection. Check your internet and try again.",
      generic: "Something went wrong. Please try again.",
    },
  },
  emailChoice: {
    title: "Continue with email",
    subtitle:
      "Do you already have a Rocha's account, or is this your first time?",
    existing: {
      title: "I have an account",
      description: "Sign in with the email you signed up with.",
    },
    new: {
      title: "I'm new here",
      description: "Create an account with your name and email.",
    },
  },
  emailSignIn: {
    title: "Sign in",
    subtitle: "Use your account's email. We'll send you a code to sign in.",
    emailPlaceholder: "you@email.com",
    emailInvalid: "Enter a valid email.",
    noAccount: "Don't have an account? <create>Create account</create>",
    submit: "Get code",
  },
  confirmCode: {
    title: "Confirm your email",
    description:
      "We sent a 6-digit code to <bold>{{email}}</bold>. It expires in 10 minutes.",
    inputLabel: "6-digit code",
    submit: "Confirm",
    resend: "Resend code",
    resendIn: "Resend code in {{time}}",
    notReceived:
      "Didn't get it? Check your spam folder or <change>change the email</change>.",
    errors: {
      wrongCode: "Wrong code. Try again.",
      expired: "This code has expired. Request a new one.",
      locked: "Too many wrong attempts. Request a new code.",
      nameNotSaved: "We couldn't save your name. Go back and check it.",
      noAccount:
        "We couldn't find an account with this email. Create one to continue.",
    },
  },
  pending: {
    eyebrow: "Account created",
    title: "Waiting for approval",
    description:
      "The Rocha's team will review your sign-up. Once it's approved, you can sign in with <bold>{{email}}</bold>.",
    steps: {
      created: "Account created",
      approval: "Team approval",
      inReview: "Under review",
      bookClasses: "Book classes",
    },
    now: "Now",
    signOut: "Sign out",
  },
  whatsapp: {
    eyebrow: "Account approved",
    title: "Welcome to Rocha's, {{firstName}}",
    description: "Just one more thing before you start.",
    cardTitle: "WhatsApp number",
    helper:
      "We only ask for your number so the school can reach you if needed — for example, if a class is cancelled because of the sea.",
    hideNumber: "Hide my number",
    hideNumberHint:
      "Only the school's admins will see it. You can change this in your profile.",
    submit: "Save and continue",
    pickerTitle: "Country",
    pickerSearch: "Search country",
    invalidNumber: "Invalid WhatsApp number.",
    sessionExpired: "Your session expired. Sign in again.",
  },
  schoolRules: {
    eyebrow: "Last step",
    title: "School rules",
    description: "Few and simple — so classes go well for everyone.",
    accept:
      "I have read and accept the rules and terms of Rocha's Surf School.",
    submit: "Enter the app",
    empty: "The school has no rules yet.",
    loadError: "Couldn't load the rules.",
    outdated: "The rules changed. Read them again and accept.",
    retry: "Try again",
  },
  rulesUpdate: {
    eyebrow: "Rules updated",
    title: "School rules",
    description:
      "We updated the school rules. Read and accept them to keep using the app.",
    submit: "Accept and continue",
  },
  closedAccount: {
    useAnotherEmail: "Use another email",
    contactSchool: "Contact the school",
    whatsappUnavailable: "Couldn't open WhatsApp.",
  },
  flows: {
    onboarding: "Onboarding",
    reactivation: "Reactivation",
    offboardingDenied: "Registration denied",
    offboardingRemoved: "Access removed",
    student: "Student",
    instructor: "Instructor",
    admin: "Admin",
  },
};

export type Messages = typeof messages;

export default messages;
