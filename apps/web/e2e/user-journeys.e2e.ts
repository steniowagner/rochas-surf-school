import { expect, test, type Page } from "@playwright/test";

import { en } from "../src/i18n/dictionaries/en";
import { es } from "../src/i18n/dictionaries/es";
import { ptBr } from "../src/i18n/dictionaries/pt-br";
import { flowRows } from "../src/modules/user-journeys/data/user-journey-flows";
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
  test("user journey pages are noindex and linked only from home", async ({ page }) => {
    for (const locale of locales) {
      for (const path of ["", ...flows.map((flow) => `/${flow}`)]) {
        await page.goto(`/${locale}/user-journeys${path}`);
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
      }

      await page.goto(`/${locale}`);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      await expect(page.locator('a[href*="/user-journeys"]')).toHaveCount(1);

      for (const path of [`/${locale}/designs`, `/${locale}/privacy-policy`, `/${locale}/designs/student-app`]) {
        await page.goto(path);
        await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
        await expect(page.locator('a[href*="/user-journeys"]')).toHaveCount(0);
      }
    }
  });
});

const STUDENT_KEY = "rochas-surf-school:user-journeys:student";
const rowsOf = (page: Page) => page.locator("tr[data-row-id]");
const counterOf = (page: Page) => page.getByTestId("journey-counter");

test.describe("user journey flow pages", () => {
  test("flow pages show every test case", async ({ page, request }) => {
    for (const flow of flows) {
      const ids = flowRows(flow).map((row) => row.id);
      const response = await page.goto(`/en/user-journeys/${flow}`);

      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(userJourneyTexts.en.flows[flow].title);
      await expect(page.getByText(userJourneyTexts.en.flows[flow].description)).toBeVisible();
      await expect(page.getByText(userJourneyTexts.en.flows[flow].account)).toBeVisible();
      await expect(rowsOf(page)).toHaveCount(caseCounts[flow]);
      await expect(rowsOf(page).first()).toHaveAttribute("data-row-id", ids[0]);
      await expect(rowsOf(page).last()).toHaveAttribute("data-row-id", ids.at(-1)!);
      await expect(page.getByRole("link", { name: en.userJourneys.labels.allFlows })).toHaveAttribute("href", "/en/user-journeys");
      for (const group of Object.values(userJourneyTexts.en.flows[flow].groups)) {
        await expect(page.getByRole("heading", { level: 2, name: group, exact: true })).toBeVisible();
      }
      for (const id of ids) {
        const row = page.locator(`tr[data-row-id="${id}"]`);
        await expect(row).toContainText(userJourneyTexts.en.rows[id].title);
        await expect(row.getByRole("checkbox", { name: `Approved — ${id}` })).not.toBeChecked();
        await expect(row.getByRole("checkbox", { name: `Denied — ${id}` })).not.toBeChecked();
      }
      expect(await page.locator("main").innerText()).not.toMatch(emailOrCode);
    }

    expect((await request.get("/en/user-journeys/unknown")).status()).toBe(404);
    expect((await request.get("/pt-br/user-journeys/design-system")).status()).toBe(404);
  });

  test("results and counter", async ({ page }) => {
    await page.goto("/en/user-journeys/student");
    await expect(counterOf(page)).toHaveText("0 approved · 0 denied · 28 not tested");

    await page.getByRole("checkbox", { name: "Approved — ST-05" }).check();
    await expect(counterOf(page)).toHaveText("1 approved · 0 denied · 27 not tested");

    await page.getByRole("checkbox", { name: "Denied — ST-05" }).check();
    await expect(page.getByRole("checkbox", { name: "Approved — ST-05" })).not.toBeChecked();
    await expect(counterOf(page)).toHaveText("0 approved · 1 denied · 27 not tested");

    await page.getByRole("checkbox", { name: "Denied — ST-05" }).uncheck();
    await expect(counterOf(page)).toHaveText("0 approved · 0 denied · 28 not tested");
    await expect(page.getByRole("checkbox", { name: "Approved — ST-04" })).not.toBeChecked();
  });

  test("copy results puts the summary on the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/en/user-journeys/student");

    await page.getByRole("textbox", { name: "Your name" }).fill("Ana");
    await page.getByRole("checkbox", { name: "Approved — ST-01" }).check();
    await page.getByRole("textbox", { name: "Notes — ST-01" }).fill("Slow to load");
    await page.getByRole("checkbox", { name: "Denied — ST-02" }).check();
    await page.getByRole("textbox", { name: "Notes — ST-02" }).fill("Arrows skip a week");
    await page.getByRole("button", { name: "Copy results" }).click();

    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    const today = await page.evaluate(() => {
      const now = new Date();
      return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((part) => String(part).padStart(2, "0")).join("-");
    });
    const rows = flowRows("student").map((row) => `${row.id} — ${userJourneyTexts.en.rows[row.id].title}`);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      [
        "Rocha's Surf School — User journeys: Student app",
        "Tester: Ana",
        `Date: ${today}`,
        "1 approved · 1 denied · 26 not tested",
        "",
        `${rows[0]}: Approved — Slow to load`,
        `${rows[1]}: Denied — Arrows skip a week`,
        ...rows.slice(2).map((row) => `${row}: Not tested`),
      ].join("\n"),
    );
    await expect(page.getByRole("button", { name: "Copy results" })).toBeVisible({ timeout: 4000 });
  });

  test("progress is saved in this browser", async ({ page, context }) => {
    await page.goto("/en/user-journeys/student");
    await page.getByRole("textbox", { name: "Your name" }).fill("Ana");
    await page.getByRole("checkbox", { name: "Approved — ST-01" }).check();
    await page.getByRole("textbox", { name: "Notes — ST-02" }).fill("Arrows skip a week");

    await page.reload();

    await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue("Ana");
    await expect(page.getByRole("checkbox", { name: "Approved — ST-01" })).toBeChecked();
    await expect(page.getByRole("textbox", { name: "Notes — ST-02" })).toHaveValue("Arrows skip a week");
    await expect(counterOf(page)).toHaveText("1 approved · 0 denied · 27 not tested");
    expect(JSON.parse((await page.evaluate((key) => localStorage.getItem(key), STUDENT_KEY))!)).toEqual({
      version: 1,
      name: "Ana",
      results: { "ST-01": "approved" },
      notes: { "ST-02": "Arrows skip a week" },
    });

    await page.goto("/es/user-journeys/student");
    await expect(page.getByRole("textbox", { name: es.userJourneys.labels.yourName })).toHaveValue("Ana");
    await expect(page.getByRole("checkbox", { name: "Aprobado — ST-01" })).toBeChecked();
    await expect(counterOf(page)).toHaveText("1 aprobados · 0 rechazados · 27 sin probar");

    await page.goto("/en/user-journeys/admin");
    await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue("");
    await expect(counterOf(page)).toHaveText("0 approved · 0 denied · 33 not tested");

    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  });

  test("a broken saved value is ignored", async ({ page }) => {
    await page.goto("/en/user-journeys/student");
    await page.evaluate((key) => localStorage.setItem(key, "{not json"), STUDENT_KEY);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.reload();

    await expect(counterOf(page)).toHaveText("0 approved · 0 denied · 28 not tested");
    await page.evaluate(
      (key) => localStorage.setItem(key, JSON.stringify({ version: 1, name: "Ana", results: { "XX-01": "approved", "ST-03": "denied" }, notes: {} })),
      STUDENT_KEY,
    );
    await page.reload();
    await expect(counterOf(page)).toHaveText("0 approved · 1 denied · 27 not tested");
    expect(errors).toEqual([]);
  });

  test("clear results", async ({ page }) => {
    await page.goto("/en/user-journeys/admin");
    await page.getByRole("textbox", { name: "Your name" }).fill("Bia");
    await page.goto("/en/user-journeys/student");
    await page.getByRole("textbox", { name: "Your name" }).fill("Ana");
    await page.getByRole("checkbox", { name: "Approved — ST-01" }).check();
    await page.getByRole("textbox", { name: "Notes — ST-02" }).fill("Slow");

    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Clear results" }).click();
    await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue("Ana");
    await expect(page.getByRole("checkbox", { name: "Approved — ST-01" })).toBeChecked();

    page.once("dialog", (dialog) => {
      expect(dialog.message()).toBe("Clear every result and note of this flow?");
      return dialog.accept();
    });
    await page.getByRole("button", { name: "Clear results" }).click();
    await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue("");
    await expect(page.getByRole("checkbox", { name: "Approved — ST-01" })).not.toBeChecked();
    await expect(page.getByRole("textbox", { name: "Notes — ST-02" })).toHaveValue("");
    await expect(counterOf(page)).toHaveText("0 approved · 0 denied · 28 not tested");
    expect(await page.evaluate((key) => localStorage.getItem(key), STUDENT_KEY)).toBeNull();

    await page.reload();
    await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue("");
    await page.goto("/en/user-journeys/admin");
    await expect(page.getByRole("textbox", { name: "Your name" })).toHaveValue("Bia");
  });

  test("design links point at their frames", async ({ page }) => {
    const designPages = { auth: "auth-flow", student: "student-app", instructor: "instructor-app", admin: "admin-app" };

    for (const flow of flows) {
      await page.goto(`/pt-br/user-journeys/${flow}`);
      const seeDesigns = page.getByRole("link", { name: ptBr.userJourneys.labels.seeDesigns });
      await expect(seeDesigns).toHaveAttribute("href", `/pt-br/designs/${designPages[flow]}`);
      await expect(seeDesigns).toHaveAttribute("target", "_blank");

      const designId = flowRows(flow).find((row) => row.designIds.length > 0)!.designIds[0];
      const link = page.locator("tr[data-row-id]").getByRole("link", { name: designId, exact: true }).first();
      await expect(link).toHaveAttribute("href", `/pt-br/designs/${designPages[flow]}#${designId}`);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener");

      await page.goto(`/pt-br/designs/${designPages[flow]}#${designId}`);
      await expect(page.locator(`[id="${designId}"]`)).toHaveCount(1);
    }

    await page.goto("/en/user-journeys/auth");
    await expect(page.locator('tr[data-row-id="AU-17"]').getByRole("link", { name: "ST-05-07" })).toHaveAttribute(
      "href",
      "/en/designs/student-app#ST-05-07",
    );
    await expect(page.locator('tr[data-row-id="AU-15"]')).toContainText("—");
    await page.goto("/en/designs/student-app#ST-05-07");
    await expect(page.locator('[id="ST-05-07"]')).toHaveCount(1);
  });

  test("flow pages follow the language", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    for (const locale of ["es", "pt-br"] as const) {
      const labels = dictionaries[locale].userJourneys.labels;
      const texts = userJourneyTexts[locale];
      await page.goto(`/${locale}/user-journeys/student`);

      await expect(page.getByRole("heading", { level: 1 })).toHaveText(texts.flows.student.title);
      await expect(page.getByText(texts.flows.student.description)).toBeVisible();
      await expect(page.getByText(texts.flows.student.account)).toBeVisible();
      for (const group of Object.values(texts.flows.student.groups)) {
        await expect(page.getByRole("heading", { level: 2, name: group, exact: true })).toBeVisible();
      }
      for (const label of [labels.seeDesigns, labels.allFlows]) {
        await expect(page.getByRole("link", { name: label })).toBeVisible();
      }
      for (const label of [labels.copyResults, labels.clearResults]) {
        await expect(page.getByRole("button", { name: label })).toBeVisible();
      }
      await expect(page.getByText(labels.savedProgress)).toBeVisible();
      for (const row of flowRows("student")) {
        const tr = page.locator(`tr[data-row-id="${row.id}"]`);
        for (const field of ["title", "beforeYouStart", "steps", "expected"] as const) {
          await expect(tr).toContainText(texts.rows[row.id][field]);
        }
      }

      await page.getByRole("checkbox", { name: `${labels.approved} — ST-01` }).check();
      await page.getByRole("button", { name: labels.copyResults }).click();
      await expect(page.getByRole("button", { name: labels.copied })).toBeVisible();
      const lines = (await page.evaluate(() => navigator.clipboard.readText())).split("\n");
      expect(lines[0]).toBe(`${dictionaries[locale].site.name} — ${dictionaries[locale].userJourneys.title}: ${texts.flows.student.title}`);
      expect(lines[1]).toBe(`${labels.tester}: —`);
      expect(lines[5]).toBe(`ST-01 — ${texts.rows["ST-01"].title}: ${labels.approved}`);
      expect(lines[6]).toBe(`ST-02 — ${texts.rows["ST-02"].title}: ${labels.notTested}`);
      await page.getByRole("checkbox", { name: `${labels.approved} — ST-01` }).uncheck();
    }

    await page.goto("/es/user-journeys/student");
    await page.locator("summary").click();
    await page.getByRole("link", { name: /English/ }).click();
    await expect(page).toHaveURL(/\/en\/user-journeys\/student$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Student app");
  });

  test("fits a phone and a desktop", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of ["", ...flows.map((flow) => `/${flow}`)]) {
      await page.goto(`/en/user-journeys${path}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(375);
    }

    const row = page.locator('tr[data-row-id="AD-05"]');
    for (const label of ["Before you start", "Steps", "Expected behavior", "Design", "Result", "Notes"]) {
      await expect(row.getByText(label, { exact: true })).toBeVisible();
    }
    for (const name of ["Approved — AD-05", "Denied — AD-05"]) {
      const box = await row.getByRole("checkbox", { name }).locator("xpath=..").boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/en/user-journeys/admin");
    const table = page.getByRole("table").first();
    for (const header of ["ID", "Title", "Before you start", "Steps", "Expected behavior", "Design", "Result", "Notes"]) {
      await expect(table.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
    }
    await expect(page.locator('tr[data-row-id="AD-05"]').getByText("Notes", { exact: true })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  });

  test("follows the theme toggle", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/en/user-journeys/student");
    const colors = () =>
      page.evaluate(() => {
        const body = getComputedStyle(document.body);
        const row = getComputedStyle(document.querySelector("tr[data-row-id]")!);
        return { background: body.backgroundColor, text: row.color, row: row.backgroundColor };
      });
    const before = await colors();

    await page.getByRole("button", { name: en.header.themeLabel }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const after = await colors();
    expect(after.background).not.toBe(before.background);
    expect(after.text).not.toBe(before.text);
  });
});
