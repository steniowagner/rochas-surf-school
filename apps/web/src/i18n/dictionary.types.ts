/** Every string of the site, in one language. Each dictionary must satisfy this type exactly. */
export type Dictionary = {
  site: {
    name: string;
    description: string;
  };
  header: {
    homeLabel: string;
    languageLabel: string;
  };
  footer: {
    text: string;
  };
  home: {
    title: string;
    description: string;
    privacyPolicy: { title: string; description: string };
    accountDeletion: { title: string; description: string };
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
    purposes: { title: string; items: string[] };
    retention: { title: string; items: string[] };
    services: { title: string; intro: string; items: string[] };
    rights: { title: string; text: string; deletionLink: string };
    site: { title: string; text: string };
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
