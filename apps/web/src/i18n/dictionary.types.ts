/** Every string of the site, in one language. Each dictionary must satisfy this type exactly. */
export type Dictionary = {
  site: {
    name: string;
    description: string;
  };
  header: {
    homeLabel: string;
    languageLabel: string;
    themeLabel: string;
  };
  footer: {
    text: string;
  };
  home: {
    title: string;
    description: string;
    privacyPolicy: { title: string; description: string };
    termsOfUse: { title: string; description: string };
    accountDeletion: { title: string; description: string };
    designs: { title: string; description: string };
  };
  designs: {
    metaTitle: string;
    metaDescription: string;
    title: string;
    description: string;
    pages: { designSystem: { title: string; description: string } };
  };
  privacyPolicy: {
    metaTitle: string;
    metaDescription: string;
    title: string;
    description: string;
    lastUpdatedLabel: string;
    lastUpdated: string;
    controller: { title: string; text: string; legalNameLabel: string; cnpjLabel: string; whatsappLabel: string };
    dpo: { title: string; text: string; nameLabel: string; emailLabel: string };
    collected: { title: string; intro: string; items: string[] };
    purposes: { title: string; intro: string; items: string[] };
    services: { title: string; intro: string; items: string[] };
    transfers: { title: string; text: string };
    retention: { title: string; intro: string; items: string[] };
    security: { title: string; intro: string; items: string[] };
    adults: { title: string; text: string };
    rights: { title: string; intro: string; items: string[]; howTo: string; complaint: string };
    deletion: { title: string; text: string; link: string };
    terms: { title: string; text: string; link: string };
    site: { title: string; text: string };
    changes: { title: string; text: string };
  };
  termsOfUse: {
    metaTitle: string;
    metaDescription: string;
    title: string;
    description: string;
    lastUpdatedLabel: string;
    lastUpdated: string;
    about: { title: string; text: string };
    who: { title: string; intro: string; items: string[] };
    rules: { title: string; text: string };
    content: { title: string; intro: string; items: string[]; outro: string };
    reporting: { title: string; text: string };
    payments: { title: string; text: string };
    coverage: { title: string; text: string };
    privacy: { title: string; text: string; policyLink: string; deletionLink: string };
    changes: { title: string; text: string };
    law: { title: string; text: string };
  };
  accountDeletion: {
    metaTitle: string;
    metaDescription: string;
    title: string;
    description: string;
    inApp: { title: string; text: string };
    noApp: { title: string; text: string; numberLabel: string; button: string };
    erased: { title: string; intro: string; items: string[] };
    kept: { title: string; intro: string; items: string[] };
    timing: { title: string; text: string };
  };
};
