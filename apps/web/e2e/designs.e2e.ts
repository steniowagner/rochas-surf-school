import { expect, test } from "@playwright/test";

import { en } from "../src/i18n/dictionaries/en";
import { es } from "../src/i18n/dictionaries/es";
import { ptBr } from "../src/i18n/dictionaries/pt-br";
import { adminAppIds } from "../src/modules/designs/data/admin-app-ids";
import { authFlowIds } from "../src/modules/designs/data/auth-flow-ids";
import { designSystemIds } from "../src/modules/designs/data/design-system-ids";
import { instructorAppIds } from "../src/modules/designs/data/instructor-app-ids";
import { studentAppIds } from "../src/modules/designs/data/student-app-ids";

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

    test("redirects /designs/student-app to the browser language", async ({ request }) => {
      const page = await request.get("/designs/student-app", { maxRedirects: 0, headers: { "accept-language": "es" } });
      expect(page.status()).toBe(307);
      expect(page.headers().location).toBe("/es/designs/student-app");

      const fallback = await request.get("/designs/student-app", { maxRedirects: 0, headers: { "accept-language": "de" } });
      expect(fallback.status()).toBe(307);
      expect(fallback.headers().location).toBe("/pt-br/designs/student-app");
    });

    test("redirects /designs/instructor-app to the browser language", async ({ request }) => {
      const page = await request.get("/designs/instructor-app", { maxRedirects: 0, headers: { "accept-language": "es" } });
      expect(page.status()).toBe(307);
      expect(page.headers().location).toBe("/es/designs/instructor-app");

      const fallback = await request.get("/designs/instructor-app", { maxRedirects: 0, headers: { "accept-language": "de" } });
      expect(fallback.status()).toBe(307);
      expect(fallback.headers().location).toBe("/pt-br/designs/instructor-app");
    });

    test("redirects /designs/admin-app to the browser language", async ({ request }) => {
      const page = await request.get("/designs/admin-app", { maxRedirects: 0, headers: { "accept-language": "es" } });
      expect(page.status()).toBe(307);
      expect(page.headers().location).toBe("/es/designs/admin-app");

      const fallback = await request.get("/designs/admin-app", { maxRedirects: 0, headers: { "accept-language": "de" } });
      expect(fallback.status()).toBe(307);
      expect(fallback.headers().location).toBe("/pt-br/designs/admin-app");
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
    await expect(cards).toHaveCount(5);
    await expect(cards.nth(0)).toHaveAttribute("href", `/${locale}/designs/design-system`);
    await expect(cards.nth(0)).toContainText(designs.pages.designSystem.title);
    await expect(cards.nth(0)).toContainText(designs.pages.designSystem.description);
    await expect(cards.nth(1)).toHaveAttribute("href", `/${locale}/designs/auth-flow`);
    await expect(cards.nth(1)).toContainText(designs.pages.authFlow.title);
    await expect(cards.nth(1)).toContainText(designs.pages.authFlow.description);
    await expect(cards.nth(2)).toHaveAttribute("href", `/${locale}/designs/student-app`);
    await expect(cards.nth(2)).toContainText(designs.pages.studentApp.title);
    await expect(cards.nth(2)).toContainText(designs.pages.studentApp.description);
    await expect(cards.nth(3)).toHaveAttribute("href", `/${locale}/designs/instructor-app`);
    await expect(cards.nth(3)).toContainText(designs.pages.instructorApp.title);
    await expect(cards.nth(3)).toContainText(designs.pages.instructorApp.description);
    await expect(cards.nth(4)).toHaveAttribute("href", `/${locale}/designs/admin-app`);
    await expect(cards.nth(4)).toContainText(designs.pages.adminApp.title);
    await expect(cards.nth(4)).toContainText(designs.pages.adminApp.description);
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
    for (const path of ["/pt-br/designs", "/pt-br/designs/auth-flow", "/pt-br/designs/student-app", "/pt-br/designs/instructor-app", "/pt-br/designs/admin-app"]) {
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

test.describe("student app page", () => {
  test("student app shows every inventory entry", async ({ page }) => {
    for (const locale of locales) {
      await page.goto(`/${locale}/designs/student-app`);

      const { studentApp, site } = dictionaries[locale];
      for (const id of studentAppIds) {
        await expect(page.locator(`[data-design-id="${id}"]`), `${locale} ${id}`).toBeVisible();
        await expect(page.locator(`[data-design-id="${id}"]`).getByTestId("phone-frame")).toBeVisible();
        await expect(page.locator(`[data-design-id="${id}"]`)).toContainText(studentApp.entries[id].title);
      }
      await expect(page.locator("[data-design-id]")).toHaveCount(studentAppIds.length);
      await expect(page.locator('h2[id^="section-"]')).toHaveText([
        `01 — ${studentApp.sections.agenda.title}`,
        `02 — ${studentApp.sections.class.title}`,
        `03 — ${studentApp.sections.myClasses.title}`,
        `04 — ${studentApp.sections.school.title}`,
        `05 — ${studentApp.sections.profile.title}`,
        `06 — ${studentApp.sections.notifications.title}`,
      ]);
      expect(await page.title()).toBe(`${studentApp.metaTitle} | ${site.name}`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", studentApp.description);
      expect(await page.locator("body").innerText()).not.toMatch(/\{\{|<\/?[a-z]+>/);
    }
  });

  test("student app draws tall frames", async ({ page }) => {
    await page.goto("/pt-br/designs/student-app");
    // The page is shorter once the web fonts replace the fallback ones, so measure after they have loaded.
    await page.evaluate(() => document.fonts.ready);

    const frame = page.locator('[data-design-id="ST-05-01"] [data-testid="phone-frame"]');
    const bounds = (await frame.boundingBox())!;
    const phone = (await page.locator('[data-design-id="ST-05-02"] [data-testid="phone-frame"]').boundingBox())!;
    expect(bounds.width).toBeCloseTo(phone.width, 0);
    expect(bounds.height).toBeGreaterThan(phone.height * 1.2);

    const remove = (await frame.getByText("Remover a conta").boundingBox())!;
    const tabs = (await frame.getByRole("tablist").boundingBox())!;
    expect(remove.y).toBeGreaterThan(bounds.y + phone.height);
    expect(tabs.y).toBeGreaterThan(remove.y);
    expect(tabs.y + tabs.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  });

  test("student app follows the language", async ({ page }) => {
    const request = { "pt-br": "Pedir para entrar", es: "Pedir plaza", en: "Request a seat" } as const;

    for (const locale of locales) {
      await page.goto(`/${locale}/designs/student-app`);

      const { studentApp } = dictionaries[locale];
      await expect(page.locator('[data-design-id="ST-02-01"]').getByRole("button", { name: request[locale] })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(studentApp.title);
      await expect(page.locator('[data-design-id="ST-02-18"]')).toContainText(studentApp.denialReason);
      await expect(page.locator('[data-design-id="ST-06-01"]')).toContainText(studentApp.notifications[1]!.title);
      await expect(page.locator('[data-design-id="ST-06-01"]')).toContainText(studentApp.notifications[1]!.body!);
    }

    await page.goto("/pt-br/designs/student-app");
    await page.locator("summary").click();
    await page.getByRole("link", { name: /English/ }).click();
    await expect(page).toHaveURL(/\/en\/designs\/student-app$/);
    await expect(page.locator('[data-design-id="ST-02-01"]').getByRole("button", { name: request.en })).toBeVisible();
  });

  test("student app follows the theme toggle", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en/designs/student-app");

    const frame = '[data-design-id="ST-01-01"] [data-testid="phone-frame"]';
    const background = () => page.locator(frame).evaluate((element) => getComputedStyle(element).backgroundColor);
    const light = await background();
    expect(light).toBe("rgb(253, 248, 243)");

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background()).toBe("rgb(22, 27, 39)");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background()).toBe("rgb(22, 27, 39)");
  });
});

test.describe("instructor app page", () => {
  test("instructor app shows every inventory entry", async ({ page }) => {
    for (const locale of locales) {
      await page.goto(`/${locale}/designs/instructor-app`);

      const { instructorApp, site } = dictionaries[locale];
      for (const id of instructorAppIds) {
        const entry = page.locator(`[data-design-id="${id}"]`);
        await expect(entry, `${locale} ${id}`).toBeVisible();
        await expect(entry.getByTestId("phone-frame")).toBeVisible();
        await expect(entry).toContainText(instructorApp.entries[id].title);
        await expect(entry).toContainText(instructorApp.entries[id].note);
      }
      await expect(page.locator("[data-design-id]")).toHaveCount(instructorAppIds.length);
      await expect(page.locator('h2[id^="section-"]')).toHaveText([
        `01 — ${instructorApp.sections.home.title}`,
        `02 — ${instructorApp.sections.classes.title}`,
        `03 — ${instructorApp.sections.class.title}`,
        `04 — ${instructorApp.sections.myClasses.title}`,
        `05 — ${instructorApp.sections.occupancy.title}`,
        `06 — ${instructorApp.sections.more.title}`,
      ]);
      await expect(page.locator('[data-design-id="IN-06-01"]')).toContainText("ST-04-02");
      expect(await page.title()).toBe(`${instructorApp.metaTitle} | ${site.name}`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", instructorApp.description);
      expect(await page.locator("body").innerText()).not.toMatch(/\{\{|<\/?[a-z]+>/);
    }

    await page.goto("/pt-br/designs/instructor-app");
    for (const id of ["IN-01-01", "IN-02-01", "IN-06-01", "IN-06-02"]) {
      await expect(page.locator(`[data-design-id="${id}"]`).getByRole("tab"), id).toHaveText(["Início", "Aulas", "Pessoas", "Perfil"]);
    }
    for (const id of instructorAppIds.filter((entry) => entry.startsWith("IN-03-"))) {
      const entry = page.locator(`[data-design-id="${id}"]`);
      await expect(entry.getByTestId("enrolment-banner"), id).toHaveCount(0);
      await expect(entry.getByRole("button", { name: /Pedir para entrar|Cancelar inscrição|Ferramentas/ }), id).toHaveCount(0);
    }
  });

  test("instructor app follows the language", async ({ page }) => {
    const readOnly = {
      "pt-br": "Matrículas, cancelamentos e mudanças de horário são feitos pela escola",
      es: "Las inscripciones, cancelaciones y cambios de horario las hace la escuela",
      en: "Enrolments, cancellations and schedule changes are made by the school",
    } as const;
    const assigned = { "pt-br": "6 aulas atribuídas a você", es: "6 clases asignadas a ti", en: "6 classes assigned to you" } as const;

    for (const locale of locales) {
      await page.goto(`/${locale}/designs/instructor-app`);

      const { instructorApp } = dictionaries[locale];
      await expect(page.locator('[data-design-id="IN-03-01"]')).toContainText(readOnly[locale]);
      await expect(page.locator('[data-design-id="IN-01-01"]')).toContainText(assigned[locale]);
      await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(instructorApp.title);
      await expect(page.locator('[data-design-id="IN-06-06"]')).toContainText(instructorApp.notifications[0]!.title);
      await expect(page.locator('[data-design-id="IN-06-06"]')).toContainText(instructorApp.notifications[0]!.body);
      await expect(page.locator('[data-design-id="IN-05-03"]')).toContainText(`${instructorApp.otherMessages}:`);
    }

    await page.goto("/pt-br/designs/instructor-app");
    await page.locator("summary").click();
    await page.getByRole("link", { name: /English/ }).click();
    await expect(page).toHaveURL(/\/en\/designs\/instructor-app$/);
    await expect(page.locator('[data-design-id="IN-03-01"]')).toContainText(readOnly.en);
  });

  test("instructor app follows the theme toggle", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en/designs/instructor-app");

    const frame = '[data-design-id="IN-01-01"] [data-testid="phone-frame"]';
    const background = () => page.locator(frame).evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(await background()).toBe("rgb(253, 248, 243)");

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background()).toBe("rgb(22, 27, 39)");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background()).toBe("rgb(22, 27, 39)");
  });
});

test.describe("admin app page", () => {
  test("admin app shows every inventory entry", async ({ page }) => {
    for (const locale of locales) {
      await page.goto(`/${locale}/designs/admin-app`);

      const { adminApp, site } = dictionaries[locale];
      for (const id of adminAppIds) {
        const entry = page.locator(`[data-design-id="${id}"]`);
        await expect(entry, `${locale} ${id}`).toBeVisible();
        await expect(entry.getByTestId("phone-frame")).toBeVisible();
        await expect(entry).toContainText(adminApp.entries[id].title);
        await expect(entry).toContainText(adminApp.entries[id].note);
      }
      await expect(page.locator("[data-design-id]")).toHaveCount(adminAppIds.length);
      await expect(page.locator('h2[id^="section-"]')).toHaveText([
        `01 — ${adminApp.sections.home.title}`,
        `02 — ${adminApp.sections.classes.title}`,
        `03 — ${adminApp.sections.class.title}`,
        `04 — ${adminApp.sections.classForms.title}`,
        `05 — ${adminApp.sections.notices.title}`,
        `06 — ${adminApp.sections.classRequests.title}`,
        `07 — ${adminApp.sections.accounts.title}`,
        `08 — ${adminApp.sections.enrolStudent.title}`,
        `09 — ${adminApp.sections.people.title}`,
        `10 — ${adminApp.sections.school.title}`,
        `11 — ${adminApp.sections.more.title}`,
      ]);
      await expect(page.locator('[data-design-id="AD-09-01"]')).toContainText("ST-04-02");
      await expect(page.locator('[data-design-id="AD-11-01"]')).toContainText("IN-04-02");
      expect(await page.title()).toBe(`${adminApp.metaTitle} | ${site.name}`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", adminApp.description);
      expect(await page.locator("body").innerText()).not.toMatch(/\{\{|<\/?[a-z]+>/);
    }

    await page.goto("/pt-br/designs/admin-app");
    for (const id of ["AD-01-01", "AD-02-01", "AD-09-01", "AD-11-04"]) {
      await expect(page.locator(`[data-design-id="${id}"]`).getByRole("tab"), id).toHaveText(["Início", "Aulas", "Pessoas", "Perfil"]);
    }
    for (const id of adminAppIds.filter((entry) => entry.startsWith("AD-03-"))) {
      const entry = page.locator(`[data-design-id="${id}"]`);
      await expect(entry.getByTestId("enrolment-banner"), id).toHaveCount(0);
      await expect(entry.getByRole("button", { name: /Pedir para entrar|Cancelar inscrição|Entrar na lista de espera/ }), id).toHaveCount(0);
    }
  });

  test("admin app follows the language", async ({ page }) => {
    const tools = { "pt-br": "Ferramentas", es: "Herramientas", en: "Tools" } as const;
    const waiting = { "pt-br": "5 pedidos · 3 aulas", es: "5 solicitudes · 3 clases", en: "5 requests · 3 classes" } as const;

    for (const locale of locales) {
      await page.goto(`/${locale}/designs/admin-app`);

      const { adminApp } = dictionaries[locale];
      await expect(page.locator('[data-design-id="AD-01-01"]')).toContainText(tools[locale]);
      await expect(page.locator('[data-design-id="AD-06-01"]')).toContainText(waiting[locale]);
      await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(adminApp.title);
      await expect(page.locator('[data-design-id="AD-11-08"]')).toContainText(adminApp.notifications[0]!.title);
      await expect(page.locator('[data-design-id="AD-11-08"]')).toContainText(adminApp.notifications[0]!.body);
      await expect(page.locator('[data-design-id="AD-03-17"]')).toContainText(`${adminApp.otherMessages}:`);
    }

    await page.goto("/pt-br/designs/admin-app");
    await page.locator("summary").click();
    await page.getByRole("link", { name: /English/ }).click();
    await expect(page).toHaveURL(/\/en\/designs\/admin-app$/);
    await expect(page.locator('[data-design-id="AD-01-01"]')).toContainText(tools.en);
  });

  test("admin app follows the theme toggle", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en/designs/admin-app");

    const frame = '[data-design-id="AD-01-01"] [data-testid="phone-frame"]';
    const background = () => page.locator(frame).evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(await background()).toBe("rgb(253, 248, 243)");

    await page.getByRole("button", { name: "Toggle theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background()).toBe("rgb(22, 27, 39)");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await background()).toBe("rgb(22, 27, 39)");
  });
});

test.describe("design pages on a phone", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("design pages fit a phone viewport", async ({ page }) => {
    for (const path of ["/pt-br/designs", "/pt-br/designs/design-system", "/pt-br/designs/auth-flow", "/pt-br/designs/student-app", "/pt-br/designs/instructor-app", "/pt-br/designs/admin-app"]) {
      await page.goto(path);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }

    const widest = await page.locator('[data-testid="phone-frame"]').evaluateAll((frames) => Math.max(...frames.map((frame) => frame.getBoundingClientRect().width)));
    expect(widest).toBeLessThan(375);
  });
});
