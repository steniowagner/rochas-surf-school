import { expect, test } from "@playwright/test";

import { designSystemIds } from "../src/modules/designs/data/design-system-ids";

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

test("home links to the designs in every language", async ({ page }) => {
  for (const locale of locales) {
    await page.goto(`/${locale}`);

    const rows = page.locator("main a");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toHaveAttribute("href", `/${locale}/privacy-policy`);
    await expect(rows.nth(1)).toHaveAttribute("href", `/${locale}/terms-of-use`);
    await expect(rows.nth(2)).toHaveAttribute("href", `/${locale}/account-deletion`);
    await expect(rows.nth(3)).toHaveAttribute("href", `/${locale}/designs`);
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

test.describe("design system page", () => {
  test("design system shows every inventory entry", async ({ page }) => {
    for (const locale of locales) {
      await page.goto(`/${locale}/designs/design-system`);

      for (const id of designSystemIds) {
        await expect(page.locator(`[data-design-id="${id}"]`), `${locale} ${id}`).toBeVisible();
      }
      expect(await page.locator("body").innerText()).not.toMatch(/\{\{|<\/?[a-z]+>/);
    }
  });

  test("design system follows the language", async ({ page }) => {
    const retry = { "pt-br": "Tentar de novo", es: "Intentar de nuevo", en: "Try again" } as const;

    for (const locale of locales) {
      await page.goto(`/${locale}/designs/design-system`);

      await expect(page.locator('[data-design-id="DS-09-03"]').getByRole("button", { name: retry[locale] }).first()).toBeVisible();
    }

    await page.goto("/pt-br/designs/design-system");
    await page.locator("summary").click();
    await page.getByRole("link", { name: /English/ }).click();
    await expect(page).toHaveURL(/\/en\/designs\/design-system$/);
  });

  test("design system follows the theme toggle", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en/designs/design-system");

    const background = (selector: string) => page.locator(selector).first().evaluate((element) => getComputedStyle(element).backgroundColor);
    const swatch = '[data-design-id="DS-01-01"] [data-testid="swatch-page"]';
    const frame = '[data-testid="phone-frame"]';
    const light = { swatch: await background(swatch), frame: await background(frame) };

    await page.getByRole("button", { name: /theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    expect(await background(swatch)).not.toBe(light.swatch);
    expect(await background(frame)).not.toBe(light.frame);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('[data-design-id="DS-01-01"]')).toContainText("#161B27");
  });
});

test.describe("design pages on a phone", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("design pages fit a phone viewport", async ({ page }) => {
    for (const path of ["/pt-br/designs", "/pt-br/designs/design-system"]) {
      await page.goto(path);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }

    const widest = await page.locator('[data-testid="phone-frame"]').evaluateAll((frames) => Math.max(...frames.map((frame) => frame.getBoundingClientRect().width)));
    expect(widest).toBeLessThan(375);
  });
});
