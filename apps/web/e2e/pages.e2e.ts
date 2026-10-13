import { expect, test } from "@playwright/test";

const locales = [
  { path: "pt-br", lang: "pt-BR" },
  { path: "es", lang: "es" },
  { path: "en", lang: "en" },
];
const pages = ["", "/privacy-policy", "/terms-of-use", "/account-deletion"];

for (const { path, lang } of locales) {
  for (const page of pages) {
    test(`/${path}${page} answers 200 in ${lang} with a heading`, async ({ page: browserPage }) => {
      const response = await browserPage.goto(`/${path}${page}`);

      expect(response?.status()).toBe(200);
      await expect(browserPage.locator("html")).toHaveAttribute("lang", lang);
      await expect(browserPage.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }
}
