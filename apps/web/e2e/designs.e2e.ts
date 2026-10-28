import { expect, test } from "@playwright/test";

const locales = ["pt-br", "es", "en"] as const;

test.describe("designs redirects", () => {
  test.describe("with Accept-Language: es", () => {
    test.use({ locale: "es" });

    test("redirects /designs to the browser language", async ({ request }) => {
      const index = await request.get("/designs", { maxRedirects: 0, headers: { "accept-language": "es" } });
      expect(index.status()).toBe(307);
      expect(index.headers().location).toBe("/es/designs");

      const page = await request.get("/designs/design-system", { maxRedirects: 0, headers: { "accept-language": "es" } });
      expect(page.status()).toBe(307);
      expect(page.headers().location).toBe("/es/designs/design-system");
    });
  });

  test("falls back to pt-br", async ({ request }) => {
    const response = await request.get("/designs", { maxRedirects: 0, headers: { "accept-language": "de" } });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe("/pt-br/designs");
  });

  test("answers 404 for an unknown design page", async ({ request }) => {
    expect((await request.get("/pt-br/designs/unknown")).status()).toBe(404);
    expect((await request.get("/fr/designs")).status()).toBe(404);
  });
});

test("index lists the design system in every language", async ({ page }) => {
  for (const locale of locales) {
    await page.goto(`/${locale}/designs`);

    const cards = page.getByTestId("design-pages").getByRole("link");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toHaveAttribute("href", `/${locale}/designs/design-system`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.title()).toContain("|");
  }
});

test.describe("design page width", () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test("design pages are wide", async ({ page }) => {
    await page.goto("/pt-br/designs");
    const wide = await page.locator("main").evaluate((element) => element.getBoundingClientRect().width);
    expect(wide).toBeGreaterThan(1000);
    expect(wide).toBeLessThanOrEqual(1440);

    await page.goto("/pt-br/privacy-policy");
    const narrow = await page.locator("main").evaluate((element) => element.getBoundingClientRect().width);
    expect(narrow).toBeLessThanOrEqual(640);
  });
});
