import type { Dictionary } from "../dictionary.types";

export const en = {
  site: {
    name: "Rocha's Surf School",
    description: "Surf and skate classes from Rocha's Surf School",
  },
  header: {
    homeLabel: "Home",
    languageLabel: "Language",
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
    accountDeletion: {
      title: "Account deletion",
      description: "How to delete your account and what happens to your data.",
    },
  },
  privacyPolicy: {
    metaTitle: "Privacy policy",
    metaDescription: "What data the Rocha's Surf School app collects, why, for how long, and which services handle it.",
    title: "Privacy policy",
    description: "This policy explains what data the Rocha's Surf School app collects, why, how long we keep it, and which services handle it.",
    lastUpdatedLabel: "Last updated",
    lastUpdated: "October 12, 2026",
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
        "Your sign-in identities: the Google or Apple account you use to sign in, or the email of the sign-in code.",
        "Your class requests and your attendance.",
        "The star ratings and comments you write about classes.",
        "Photos from classes that you appear in or upload.",
        "Your device's push notification token.",
        "The language you chose.",
      ],
    },
    purposes: {
      title: "Why we use it",
      items: [
        "create and keep your account and let the school approve your registration;",
        "organize classes, requests for a spot in a class, and attendance;",
        "send notices about your registration, classes and reminders in the app and as push notifications;",
        "show ratings and comments to improve the classes;",
        "show the app in your language;",
        "contact you on WhatsApp when needed.",
      ],
    },
    retention: {
      title: "How long we keep it",
      items: [
        "While your account exists, we keep its data.",
        "Deleted account: we erase your personal data 30 days after deletion. During that time you can ask to reactivate it.",
        "Account removed by the school: we erase the personal data 30 days after the removal.",
        "Denied registration: we erase everything 30 days after the denial.",
        "Guest data in a class: erased 30 days after the class.",
        "When erased, the school's history stays without your name: star ratings, classes and photos remain, and the person appears as \"Former student\" or \"Former instructor\".",
      ],
    },
    services: {
      title: "Who handles the data",
      intro: "We use these services to make the app work:",
      items: [
        "Google: sign-in with a Google account, and Google Maps to show class locations.",
        "Apple: sign-in with an Apple account.",
        "Resend: sends the sign-in code email (receives your email and the code).",
        "Expo: delivers push notifications (receives the device token and the notification text).",
        "A cloud hosting service, where the app and its database run.",
        "A language model (AI) service, which receives only the class details and the cancellation rule text, never personal data.",
        "An S3-compatible photo storage service, where class photos are kept.",
      ],
    },
    rights: {
      title: "Your rights",
      text: "You can ask for access to, correction or deletion of your data at any time. To delete your account, see the account deletion page or talk to the school.",
      deletionLink: "How to delete your account",
    },
    site: {
      title: "This website",
      text: "This website uses no cookies and has no tracking or analytics.",
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
