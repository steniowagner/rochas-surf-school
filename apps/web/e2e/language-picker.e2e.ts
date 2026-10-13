import { expect, test } from "@playwright/test";

test("choosing English on the Portuguese terms page lands on the English terms page", async ({
  page,
}) => {
  await page.goto("/pt-br/terms-of-use");

  await page.locator("summary").click();
  await page.getByRole("link", { name: /English/ }).click();

  await expect(page).toHaveURL(/\/en\/terms-of-use$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
