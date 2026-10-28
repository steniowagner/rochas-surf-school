import type { Dictionary } from "../dictionary.types";

export const en = {
  site: {
    name: "Rocha's Surf School",
    description: "Surf and skate classes from Rocha's Surf School",
  },
  header: {
    homeLabel: "Home",
    languageLabel: "Language",
    themeLabel: "Toggle theme",
  },
  footer: {
    text: "Rocha's Surf School",
  },
  home: {
    title: "Surf and skate classes",
    description: "Here is the public information about the Rocha's Surf School app: how we handle your data and how to delete your account.",
    privacyPolicy: {
      title: "Privacy policy",
      description: "What the app collects, why, and for how long.",
    },
    termsOfUse: {
      title: "Terms of use",
      description: "The rules for using the app and what you may post.",
    },
    accountDeletion: {
      title: "Account deletion",
      description: "How to delete your account and what happens to your data.",
    },
    designs: {
      title: "Designs",
      description: "How the app is designed: the design system with colors, typography and components.",
    },
  },
  designs: {
    metaTitle: "Designs",
    metaDescription: "See how the app is designed: the design system with the colors, typography and components its screens use. It follows the theme and language picked at the top of the page.",
    title: "The app's designs",
    description: "See how the app is designed: the design system with the colors, typography and components its screens use. It follows the theme and language picked at the top of the page.",
    pages: { designSystem: { title: "Design system", description: "The app's colors, typography, controls, cards and states." } },
  },
  privacyPolicy: {
    metaTitle: "Privacy policy",
    metaDescription: "What data the Rocha's Surf School app collects, why, for how long, and which services handle it.",
    title: "Privacy policy",
    description: "This policy explains what data the Rocha's Surf School app collects, why, how long we keep it, and which services handle it.",
    lastUpdatedLabel: "Last updated",
    lastUpdated: "October 13, 2026",
    controller: {
      title: "Who is responsible",
      text: "Rocha's Surf School is responsible for your data. For any privacy question, contact the school.",
      legalNameLabel: "Legal name",
      cnpjLabel: "CNPJ",
      whatsappLabel: "WhatsApp",
    },
    dpo: {
      title: "Data protection contact (encarregado)",
      text: "The encarregado is the communication channel between you, the school and the ANPD (Brazil's National Data Protection Authority).",
      nameLabel: "Name",
      emailLabel: "Email",
    },
    collected: {
      title: "What we collect",
      intro: "We collect only what the app needs to work:",
      items: [
        "Your name, email and photo.",
        "Your WhatsApp number, and whether you agree to show it to other people at the school.",
        "Your sign-in identities: the Google or Apple account you use to sign in, or the email that receives the sign-in code.",
        "Your class requests and your attendance.",
        "The star ratings and comments you write about classes.",
        "Photos from classes that you appear in or upload.",
        "Your device's push notification token.",
        "The language you chose.",
        "Guest data: the name and WhatsApp number of a person without an account, entered by a school admin so they can attend a class.",
      ],
    },
    purposes: {
      title: "Why we use it, and on what legal basis",
      intro: "Each use of your data rests on one of the legal bases of the LGPD (Brazil's General Data Protection Law):",
      items: [
        "Creating and keeping your account, approving your registration, organizing classes and requests for a spot, recording attendance, showing ratings and comments, and sending notices in the app: performance of a contract (LGPD, Art. 7, V).",
        "Sending push notifications to your phone, and showing your WhatsApp number to other people at the school if you chose to: your consent (LGPD, Art. 7, I). You can withdraw it at any time in your phone's settings or in the app.",
        "Keeping star ratings and the school's class history without your name after your data is erased, and keeping a guest's data for the class they attend: the school's legitimate interest in keeping its records and running its classes (LGPD, Art. 7, IX).",
      ],
    },
    services: {
      title: "Who handles the data",
      intro: "We use these services to make the app work:",
      items: [
        "Google: sign-in with a Google account, Google Maps to show class locations, and address suggestions when admins save a location (receives the search text).",
        "Apple: sign-in with an Apple account, and Apple Maps to show class locations on iPhone.",
        "Resend: sends the sign-in code email (receives your email and the code).",
        "Expo: delivers push notifications (receives the device token and the notification text).",
        "A cloud hosting service, where the app and its database run.",
        "Anthropic (Claude): works out each class's cancellation deadline; receives only the class details and the text of the cancellation rule, never personal data.",
        "An S3-compatible photo storage service, where class photos are kept.",
      ],
    },
    transfers: {
      title: "Transfers outside Brazil",
      text: "These services may process data in other countries. When that happens, the transfer follows the safeguards the LGPD allows (Art. 33), such as contractual clauses and the providers' own data protection commitments.",
    },
    retention: {
      title: "How long we keep it",
      intro: "We keep each kind of data only for as long as it is needed:",
      items: [
        "Sign-in codes: 10 minutes.",
        "Your session on a device: 30 days after you last used the app.",
        "Your device's push token: until you sign out on that device or your account is erased.",
        "Account data: while your account exists.",
        "Deleted account: we erase your personal data 30 days after the deletion. During that time you can ask to reactivate the account.",
        "Account removed by the school: we erase the personal data 30 days after the removal.",
        "Denied registration: we erase everything 30 days after the denial.",
        "Guest name and WhatsApp number: erased 30 days after the class finishes or is cancelled.",
        "When data is erased, the school's history stays without your name: star ratings remain without a name, and classes and photos show \"Former student\" or \"Former instructor\" in your place.",
      ],
    },
    security: {
      title: "How we protect it",
      intro: "We protect your data with:",
      items: [
        "encrypted connections (HTTPS) between the app and our servers;",
        "access limited by role: each person sees only what their role allows;",
        "sign-in without passwords, with a code sent to your email or with your Google or Apple account.",
      ],
    },
    adults: {
      title: "Adults only",
      text: "The app is for people aged 18 or older. We do not create accounts for minors. If we find that an account belongs to a minor, we remove it and erase its data.",
    },
    rights: {
      title: "Your rights",
      intro: "Under the LGPD (Art. 18), you can ask us for:",
      items: [
        "confirmation that we process your data;",
        "access to your data;",
        "correction of incomplete, inaccurate or outdated data;",
        "anonymization, blocking or deletion of unnecessary or excessive data;",
        "portability of your data;",
        "deletion of the data processed with your consent;",
        "information about who we share your data with;",
        "information about the possibility of refusing consent and its consequences;",
        "withdrawal of your consent.",
      ],
      howTo: "To exercise any of these rights, email the data protection contact above or message the school on WhatsApp.",
      complaint: "You can also file a complaint with the ANPD (Autoridade Nacional de Proteção de Dados), Brazil's data protection authority.",
    },
    deletion: {
      title: "Deleting your account",
      text: "You can delete your account at any time.",
      link: "How to delete your account",
    },
    terms: {
      title: "Terms of use",
      text: "The rules for using the app are in our terms of use.",
      link: "Read the terms of use",
    },
    site: {
      title: "This website",
      text: "This website uses no cookies and has no tracking or analytics.",
    },
    changes: {
      title: "Changes to this policy",
      text: "When this policy changes, we publish the new version on this page with a new \"Last updated\" date.",
    },
  },
  termsOfUse: {
    metaTitle: "Terms of use",
    metaDescription: "The rules for using the Rocha's Surf School app: who can use it, what you may post, how to report content and what the terms do not cover.",
    title: "Terms of use",
    description: "These terms explain how you may use the Rocha's Surf School app.",
    lastUpdatedLabel: "Last updated",
    lastUpdated: "October 13, 2026",
    about: {
      title: "About these terms",
      text: "These terms apply to the Rocha's Surf School app. By using the app, you accept them.",
    },
    who: {
      title: "Who can use the app",
      intro: "To use the app:",
      items: [
        "you must be 18 or older;",
        "your registration must be approved by the school: every account is reviewed before it can be used;",
        "the decisions of the school's admins in the app, such as approvals, denials, roles and removals, are final;",
        "the school can remove an account that breaks these terms or the school rules.",
      ],
    },
    rules: {
      title: "School rules",
      text: "The school rules you accept in the app also apply. They keep governing conduct at the school, while these terms govern the use of the app.",
    },
    content: {
      title: "What you post",
      intro: "Comments and photos you post in the app must respect other people. These are forbidden:",
      items: [
        "harassment and bullying;",
        "hate speech;",
        "nudity and sexual content;",
        "violence;",
        "illegal content;",
        "other people's private data.",
      ],
      outro: "Admins delete content that breaks these rules and can remove the account that posted it.",
    },
    reporting: {
      title: "Reporting content",
      text: "The app has no report button. To report a comment, a photo or a person, message the school on WhatsApp:",
    },
    payments: {
      title: "Payments",
      text: "The app does not take payments.",
    },
    coverage: {
      title: "What these terms do not cover",
      text: "These terms are not a liability waiver. The risks of surfing and skating, and payments, are covered by the school's own agreement with each student.",
    },
    privacy: {
      title: "Privacy",
      text: "How we handle your data, and how to delete your account, are explained on these pages:",
      policyLink: "Privacy policy",
      deletionLink: "Account deletion",
    },
    changes: {
      title: "Changes to these terms",
      text: "When these terms change, we publish the new version on this page with a new \"Last updated\" date.",
    },
    law: {
      title: "Applicable law",
      text: "Brazilian law applies to these terms.",
    },
  },
  accountDeletion: {
    metaTitle: "Account deletion",
    metaDescription: "How to delete your Rocha's Surf School account and what happens to your data.",
    title: "Account deletion",
    description: "See how to delete your Rocha's Surf School account, what is erased and what stays without your name.",
    inApp: {
      title: "If you have the app",
      text: "Open the app and go to Profile → Delete account. Then confirm the deletion.",
    },
    noApp: {
      title: "If you no longer have the app",
      text: "Message the school on WhatsApp and ask for the deletion. An admin carries out the request by removing your account.",
      numberLabel: "School's WhatsApp",
      button: "Message the school on WhatsApp",
    },
    erased: {
      title: "What is erased",
      intro: "We erase your personal data:",
      items: [
        "name;",
        "email;",
        "photo;",
        "WhatsApp number;",
        "comments.",
      ],
    },
    kept: {
      title: "What stays without your name",
      intro: "The school's history continues, without identifying you:",
      items: [
        "star ratings;",
        "classes and photos, which show \"Former student\" or \"Former instructor\" in the person's place.",
      ],
    },
    timing: {
      title: "When",
      text: "We erase this data 30 days after the account is deleted or removed.",
    },
  },
} satisfies Dictionary;
