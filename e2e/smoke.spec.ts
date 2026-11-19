import { expect, test } from "@playwright/test";

test("홈 화면이 열리고 Dinner Nearby 제목이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Dinner Nearby");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dinner Nearby");
});
