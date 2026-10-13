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
};
