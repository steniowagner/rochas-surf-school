import { expect, test } from "@playwright/test";

import { en } from "../src/i18n/dictionaries/en";
import { es } from "../src/i18n/dictionaries/es";
import { ptBr } from "../src/i18n/dictionaries/pt-br";
import { authFlowIds } from "../src/modules/designs/data/auth-flow-ids";
import { designSystemIds } from "../src/modules/designs/data/design-system-ids";

const locales = ["pt-br", "es", "en"] as const;
const dictionaries = { "pt-br": ptBr, es, en };

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

    test("redirects /designs/auth-flow to the browser language", async ({ request }) => {
      const page = await request.get("/designs/auth-flow", { maxRedirects: 0, headers: { "accept-language": "es" } });
      expect(page.status()).toBe(307);
      expect(page.headers().location).toBe("/es/designs/auth-flow");

      const fallback = await request.get("/designs/auth-flow", { maxRedirects: 0, headers: { "accept-language": "de" } });
      expect(fallback.headers().location).toBe("/pt-br/designs/auth-flow");
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

test("index lists the design pages in every language", async ({ page }) => {
  for (const locale of locales) {
    await page.goto(`/${locale}/designs`);

    const { designs, site } = dictionaries[locale];
    const cards = page.getByTestId("design-pages").getByRole("link");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toHaveAttribute("href", `/${locale}/designs/design-system`);
    await expect(cards.nth(0)).toContainText(designs.pages.designSystem.title);
    await expect(cards.nth(0)).toContainText(designs.pages.designSystem.description);
    await expect(cards.nth(1)).toHaveAttribute("href", `/${locale}/designs/auth-flow`);
    await expect(cards.nth(1)).toContainText(designs.pages.authFlow.title);
    await expect(cards.nth(1)).toContainText(designs.pages.authFlow.description);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(designs.title);
    await expect(page.getByText(designs.description, { exact: true })).toBeVisible();
    expect(await page.title()).toBe(`${designs.metaTitle} | ${site.name}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", designs.metaDescription);
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
    await expect(rows.nth(3)).toContainText(dictionaries[locale].home.designs.title);
    await expect(rows.nth(3)).toContainText(dictionaries[locale].home.designs.description);
  }
});

test.describe("design page width", () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test("design pages are wide", async ({ page }) => {
    for (const path of ["/pt-br/designs", "/pt-br/designs/auth-flow"]) {
      await page.goto(path);
      const wide = await page.locator("main").evaluate((element) => element.getBoundingClientRect().width);
      expect(wide, path).toBeGreaterThan(1000);
      expect(wide, path).toBeLessThanOrEqual(1440);
    }

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

      const { designSystem } = dictionaries[locale];
      await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(designSystem.title);
      await expect(page.locator("#section-01")).toHaveText(`01 — ${designSystem.sections.color.title}`);
      await expect(page.getByText(designSystem.sections.color.description, { exact: true })).toBeVisible();
      await expect(page.locator("#section-09")).toHaveText(`09 — ${designSystem.sections.states.title}`);
    }

    await page.goto("/pt-br/designs/design-system");
    await page.locator("summary").click();
    await page.getByRole("link", { name: /English/ }).click();
    await expect(page).toHaveURL(/\/en\/designs\/design-system$/);
  });

  test("design system follows the OS color scheme without a stored choice", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/en/designs/design-system");

    const background = (selector: string) => page.locator(selector).first().evaluate((element) => getComputedStyle(element).backgroundColor);
    const darkPage = "rgb(22, 27, 39)";
    expect(await background('[data-design-id="DS-01-01"] [data-testid="swatch-page"]')).toBe(darkPage);
    expect(await background('[data-testid="phone-frame"]')).toBe(darkPage);

    const colors = page.locator('[data-design-id="DS-01-01"]');
    await expect(colors).toContainText("#FDF8F3");
    await expect(colors).toContainText("#161B27");
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

test.describe("auth flow page", () => {
  test("auth flow shows every inventory entry", async ({ page }) => {
    for (const locale of locales) {
      await page.goto(`/${locale}/designs/auth-flow`);

      const { authFlow, site } = dictionaries[locale];
      for (const id of authFlowIds) {
        await expect(page.locator(`[data-design-id="${id}"]`), `${locale} ${id}`).toBeVisible();
        await expect(page.locator(`[data-design-id="${id}"]`).getByTestId("phone-frame")).toBeVisible();
        await expect(page.locator(`[data-design-id="${id}"]`)).toContainText(authFlow.entries[id].title);
      }
      await expect(page.locator("[data-design-id]")).toHaveCount(authFlowIds.length);
      await expect(page.locator("h2")).toHaveText([`01 — ${authFlow.sections.signIn.title}`, `02 — ${authFlow.sections.email.title}`, `03 — ${authFlow.sections.onboarding.title}`, `04 — ${authFlow.sections.closedAccount.title}`]);
      expect(await page.title()).toBe(`${authFlow.metaTitle} | ${site.name}`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", authFlow.description);
      const text = await page.locator("body").innerText();
      expect(text).not.toMatch(/\{\{|<\/?[a-z]+>/);
      expect(text).not.toMatch(/Apple/);
    }
  });

  test("auth flow follows the language", async ({ page }) => {
    const google = { "pt-br": "Continuar com o Google", es: "Continuar con Google", en: "Continue with Google" } as const;

    for (const locale of locales) {
      await page.goto(`/${locale}/designs/auth-flow`);

      await expect(page.locator('[data-design-id="AF-01-01"]').getByRole("button", { name: google[locale] })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(dictionaries[locale].authFlow.title);
      await expect(page.locator('[data-design-id="AF-04-05"]')).toContainText(dictionaries[locale].authFlow.denialReason);
      await expect(page.locator('[data-design-id="AF-02-10"]')).toContainText("ana.lima@email.com");
    }

    await page.goto("/pt-br/designs/auth-flow");
    await page.locator("summary").click();
    await page.getByRole("link", { name: /English/ }).click();
    await expect(page).toHaveURL(/\/en\/designs\/auth-flow$/);
    await expect(page.locator('[data-design-id="AF-01-01"]').getByRole("button", { name: google.en })).toBeVisible();
  });

  test("auth flow follows the theme toggle", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en/designs/auth-flow");

    const background = (selector: string) => page.locator(selector).first().evaluate((element) => getComputedStyle(element).backgroundColor);
    const signIn = '[data-design-id="AF-01-01"] [data-testid="phone-frame"]';
    const email = '[data-design-id="AF-02-01"] [data-testid="phone-frame"]';
    const light = { signIn: await background(signIn), email: await background(email) };
    expect(light.signIn).toBe(light.email);

    await page.getByRole("button", { name: /theme/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    expect(await background(email)).not.toBe(light.email);
    expect(await background(signIn)).toBe(light.signIn);

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background(signIn)).toBe(light.signIn);
    expect(await background(email)).not.toBe(light.email);
  });
});

test.describe("design pages on a phone", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("design pages fit a phone viewport", async ({ page }) => {
    for (const path of ["/pt-br/designs", "/pt-br/designs/design-system", "/pt-br/designs/auth-flow"]) {
      await page.goto(path);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }

    const widest = await page.locator('[data-testid="phone-frame"]').evaluateAll((frames) => Math.max(...frames.map((frame) => frame.getBoundingClientRect().width)));
    expect(widest).toBeLessThan(375);
  });
});
