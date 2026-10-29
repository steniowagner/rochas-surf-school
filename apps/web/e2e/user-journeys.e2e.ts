import { expect, test } from "@playwright/test";

import { en } from "../src/i18n/dictionaries/en";
import { es } from "../src/i18n/dictionaries/es";
import { ptBr } from "../src/i18n/dictionaries/pt-br";
import { userJourneyTexts } from "../src/modules/user-journeys/i18n/user-journey-texts";

const locales = ["pt-br", "es", "en"] as const;
const dictionaries = { "pt-br": ptBr, es, en };
const flows = ["auth", "student", "instructor", "admin"] as const;
const caseCounts = { auth: 19, student: 28, instructor: 16, admin: 33 };

// An email address or a 6-digit sign-in code: never on a user journey page (spec 076 D-06).
const emailOrCode = /[\w.+-]+@[\w-]+\.[\w.]+|\b\d{6}\b/;

test.describe("user journeys index", () => {
  for (const locale of locales) {
    test(`index lists the four flows in every language (${locale})`, async ({ page }) => {
      const text = dictionaries[locale].userJourneys;
      const response = await page.goto(`/${locale}/user-journeys`);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(text.title);
      for (const paragraph of text.intro) {
        await expect(page.getByText(paragraph)).toBeVisible();
      }
      await expect(page.getByRole("heading", { name: text.beforeYouStart.title })).toBeVisible();
      for (const item of text.beforeYouStart.items) {
        await expect(page.getByText(item)).toBeVisible();
      }

      const cards = page.getByTestId("user-journey-flows").getByRole("link");
      await expect(cards).toHaveCount(4);
      for (const [index, flow] of flows.entries()) {
        const card = cards.nth(index);
        const count = caseCounts[flow];
        await expect(card).toHaveAttribute("href", `/${locale}/user-journeys/${flow}`);
        await expect(card).toContainText(userJourneyTexts[locale].flows[flow].title);
        await expect(card).toContainText(userJourneyTexts[locale].flows[flow].description);
        await expect(card).toContainText(text.caseCount.other.replace("{count}", String(count)));
      }

      expect(await page.locator("main").innerText()).not.toMatch(emailOrCode);
    });
  }

  test("answers 404 for an unknown language", async ({ request }) => {
    expect((await request.get("/de/user-journeys")).status()).toBe(404);
  });
});

test.describe("user journeys redirects", () => {
  test("redirects /user-journeys to the browser language", async ({ request }) => {
    const index = await request.get("/user-journeys", { maxRedirects: 0, headers: { "accept-language": "es" } });
    expect(index.status()).toBe(307);
    expect(index.headers().location).toBe("/es/user-journeys");

    const flow = await request.get("/user-journeys/admin", { maxRedirects: 0, headers: { "accept-language": "es" } });
    expect(flow.status()).toBe(307);
    expect(flow.headers().location).toBe("/es/user-journeys/admin");

    const fallback = await request.get("/user-journeys", { maxRedirects: 0, headers: { "accept-language": "de" } });
    expect(fallback.status()).toBe(307);
    expect(fallback.headers().location).toBe("/pt-br/user-journeys");

    const designs = await request.get("/designs", { maxRedirects: 0, headers: { "accept-language": "es" } });
    expect(designs.headers().location).toBe("/es/designs");
  });
});

test.describe("user journeys visibility", () => {
  test("user journey pages are noindex and not linked", async ({ page }) => {
    for (const locale of locales) {
      await page.goto(`/${locale}/user-journeys`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");

      for (const path of [`/${locale}`, `/${locale}/designs`, `/${locale}/privacy-policy`, `/${locale}/designs/student-app`]) {
        await page.goto(path);
        await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
        await expect(page.locator('a[href*="/user-journeys"]')).toHaveCount(0);
      }
    }
  });
});
