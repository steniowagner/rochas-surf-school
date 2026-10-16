// English (US) is the source of truth for the message keys; the other locales are typed against it.
const messages = {
  language: {
    button: "Language",
    title: "Language",
    description: "Choose the app language.",
  },
  common: {
    cancel: "Cancel",
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
  googleSignIn: {
    tokenInvalid: "We couldn't sign you in with Google. Try again.",
    emailNotVerified:
      "Your Google email isn't verified. Use another sign-in method.",
    playServices: "Google Play services is unavailable on this phone.",
  },
  googleName: {
    title: "What's your name?",
    description: "Enter your full name so the school knows who you are.",
    submit: "Continue",
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
  },
  session: {
    expired: "Your session expired. Sign in again.",
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
  denied: {
    eyebrow: "Registration not approved",
    title: "Not this time",
    description:
      "The Rocha's team didn't approve the registration of <bold>{{email}}</bold>. If you think it's a mistake, talk to us.",
    noteTitle: "Message from the team",
  },
  removed: {
    eyebrow: "Access removed",
    title: "You no longer have access to the app",
    description:
      "The Rocha's team removed access for <bold>{{email}}</bold>. This account can't be reactivated from the app.",
    noteTitle: "Questions?",
    noteText: "Talk to the school directly on WhatsApp.",
  },
  reactivation: {
    notRequested: {
      eyebrow: "Account deleted",
      title: "This account is no longer active",
      description:
        "The account <bold>{{email}}</bold> was deleted. To use it again, ask the Rocha's team to reactivate it.",
      noteTitle: "How to reactivate",
      noteText:
        'Tap "Request reactivation". The team gets the request and decides. Sign in again with this email to see the answer.',
      request: "Request reactivation",
    },
    requested: {
      eyebrow: "Request sent",
      title: "The team will review it",
      description: "We got your request to reactivate <bold>{{email}}</bold>.",
      noteTitle: "What now?",
      noteText:
        "When the team answers, sign in again with this email to see the answer.",
    },
    denied: {
      eyebrow: "Request denied",
      title: "Couldn't reactivate",
      description:
        "The Rocha's team denied the request to reactivate <bold>{{email}}</bold>. This account will stay inactive.",
    },
    accountChanged: "Your account changed. Sign in again to continue.",
  },
  admin: {
    home: {
      toolsSection: "Tools",
      schoolSection: "School",
      title: "School tools",
      registrationsRow: "Join the school",
      newClassRow: "Create classes",
      waiting: "{{count}} waiting",
    },
  },
  instructor: {
    home: {
      title: "Dashboard",
    },
  },
  home: {
    peopleRow: "People",
  },
  registrations: {
    title: "Join the school",
    description: "People waiting for the school's approval.",
    asked: "Asked {{time}}",
    askedNow: "Asked just now",
    approve: "Approve",
    deny: "Deny",
    empty: "No one is waiting to join.",
    loadError: "Couldn't load the registrations.",
    retry: "Try again",
    alreadyDecided: "This registration was already decided.",
    denySheet: {
      title: "Deny {{name}}?",
      hint: "The reason is optional and is shown to the person.",
      label: "Reason (optional)",
      confirm: "Deny registration",
    },
  },
  decision: {
    decidedJustNow: "Decided just now",
    approved: "Approved",
    denied: "Denied",
  },
  flows: {
    onboarding: "Onboarding",
    student: "Student",
    instructor: "Instructor",
    admin: "Admin",
  },
  themeSheet: {
    title: "Theme",
    description: "Until you choose, the app follows your phone's theme.",
  },
  theme: {
    system: "Same as phone",
    light: "Light",
    dark: "Dark",
  },
  profile: {
    role: {
      student: "Student",
      instructor: "Instructor",
      admin: "Admin",
    },
    editProfile: "Edit profile",
    whatsapp: "WhatsApp",
    whatsappVisible: "Visible",
    whatsappHidden: "Hidden",
    theme: "Theme",
    language: "Language",
    push: "Push notifications",
    pushNote: "Notifications always stay in the app. Here you only choose whether they also reach your phone.",
    pushDenied: "Allow notifications for the app in your phone's settings.",
    schoolRules: "School rules",
    cancellationRules: "Cancellation rules",
    about: "About the app",
    privacyPolicy: "Privacy policy",
    termsOfUse: "Terms of use",
    removeAccount: "Remove account",
    signOut: "Sign out",
    comingSoon: "Coming soon.",
  },
  tabs: {
    agenda: "Schedule",
    myClasses: "My classes",
    school: "School",
    home: "Home",
    classes: "Classes",
    profile: "Profile",
  },
  editProfile: {
    title: "Edit profile",
    nameLabel: "Name",
    emailLabel: "Email",
    emailHint: "Your email can't be changed.",
    changePhoto: "Change profile photo",
    save: "Save",
  },
  profileWhatsapp: {
    title: "WhatsApp",
    description: "Admins always see your number. Choose whether students and instructors can see it too.",
    save: "Save",
  },
  schoolRulesScreen: {
    title: "School rules",
    description: "Few and simple, so classes go well for everyone.",
  },
  signOutSheet: {
    title: "Sign out?",
    description: "To come back, just sign in again with the same account.",
    confirm: "Sign out",
    cancel: "Cancel",
  },
  about: {
    version: "Version {{version}}",
    description: "A personal project to take class booking out of WhatsApp groups: the week's schedule, seat requests and notices in one place.",
    creatorRole: "Design and development",
    repository: "App repository",
    creatorGithub: "Creator's GitHub",
    creatorLinkedin: "Creator's LinkedIn",
    close: "Close",
  },
  people: {
    title: "People",
    count: "{{count}} on the platform",
    searchPlaceholder: "Search people",
    filter: {
      student: "Students",
      instructor: "Instructors",
      admin: "Admins",
    },
    since: "since {{date}}",
    empty: "No one found",
    loadError: "Couldn't load people.",
    whatsapp: "Chat on WhatsApp",
    whatsappNotShared: "Number not shared.",
    whatsappUnavailable: "Couldn't open WhatsApp.",
  },
  deleteAccountSheet: {
    title: "Remove your account?",
    description: "Your account closes now and your upcoming seats and requests are cancelled. You can ask to reactivate it within 30 days.",
    confirm: "Remove account",
    cancel: "Cancel",
  },
  newClass: {
    title: "New class",
    discipline: {
      label: "Discipline",
      surf: "Surf",
      skate: "Skate",
    },
    level: {
      label: "Level",
      hint: "label only",
      beginner: "Beginner",
      advanced: "Advanced",
      expert: "Expert",
    },
    days: {
      label: "Days",
      count_one: "1 day",
      count_other: "{{count}} days",
      pickOne: "pick at least 1",
    },
    calendar: {
      start: "Tap a day to start",
      pickEnd: "{{date}} · tap another day for a range",
      clear: "Clear",
      previousMonth: "Previous month",
      nextMonth: "Next month",
    },
    range: {
      excluded: "Removed days",
      noneExcluded: "No days removed",
      description:
        "Tap a day in the range to remove it. Tap it again to put it back.",
    },
    timeRanges: {
      label: "Times",
      pickOne: "pick at least 1",
      hint: "Suggested from last week's classes.",
      hintPast: "Times that already passed today have no class today.",
      hintOverlap: "Overlapping times can't go in the same batch.",
      add: "New time",
    },
    location: {
      label: "Location",
      pickOne: "pick a location",
      add: "New location",
    },
    capacity: {
      label: "Maximum capacity",
      unit: "students per class",
      decrease: "Decrease",
      increase: "Increase",
    },
    notes: {
      label: "Notes",
      optional: "optional",
      placeholder: "E.g. Meet in front of the lifeguard tower. Bring sunscreen.",
    },
    instructors: {
      label: "Instructors",
      pickOne: "at least 1",
      loadError: "Couldn't load the instructors.",
    },
    summary: {
      days_one: "1 day",
      days_other: "{{count}} days",
      times_one: "1 time",
      times_other: "{{count}} times",
      line: "{{days}} × {{times}} · {{location}}",
    },
    submit_one: "Create class",
    submit_other: "Create {{count}} classes",
    tooMany: "At most {{max}} classes at a time.",
    created_one: "Class created",
    created_other: "{{count}} classes created",
    errors: {
      past: "One of the times has already passed. Check the dates and times.",
      instructors: "One of the instructors can no longer teach.",
      location: "The chosen location no longer exists.",
    },
  },
  timeRangeSheet: {
    title: "New time",
    description: "Set the start and end time. It's for this batch only — it isn't kept as a suggestion.",
    start: "Start",
    end: "End",
    endBeforeStart: "The end must be after the start.",
    submit: "Add time",
  },
  locationSheet: {
    title: "New location",
    description: "Students see the name and the address.",
    name: "Name",
    namePlaceholder: "E.g. Praia do Futuro",
    address: "Address",
    addressPlaceholder: "E.g. Av. Zezé Diogo, 5000 – Fortaleza",
    duplicate: "A location with this name already exists.",
    submit: "Save location",
  },
};

export type Messages = typeof messages;

export default messages;
