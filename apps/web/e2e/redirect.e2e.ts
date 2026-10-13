import { expect, test } from "@playwright/test";

test.describe("language redirect", () => {
  test.describe("with Accept-Language: es", () => {
    test.use({ locale: "es" });

    test("/ lands on /es", async ({ page }) => {
      await page.goto("/");

      await expect(page).toHaveURL(/\/es$/);
    });
  });

  test.describe("with an unsupported Accept-Language", () => {
    test.use({ locale: "de" });

    test("/ lands on /pt-br", async ({ page }) => {
      await page.goto("/");

      await expect(page).toHaveURL(/\/pt-br$/);
    });
  });
});
