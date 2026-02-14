import { expect, type Page } from '@playwright/test';

/**
 * Wait for the sidebar goal list to reach a specific count.
 */
export async function waitForGoalCount(page: Page, count: number, timeout = 3000) {
  await expect(page.getByTestId('sidebar-goals-list').locator('.output-goal')).toHaveCount(
    count,
    { timeout }
  );
}

/**
 * Add a goal via the sidebar goal dialog.
 */
export async function addGoal(page: Page, productName: string, qty: number) {
  const goalList = page.getByTestId('sidebar-goals-list');
  const initialGoalCount = await goalList.locator('.output-goal').count();

  // Click "+" button in the goals list to open product selector
  await goalList.getByRole('button').click();

  // Wait for the product search input to be visible (dialog may animate in)
  const searchInput = page.getByPlaceholder('Search Products...');
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });

  // Search for the product
  await searchInput.fill(productName);

  // Click the first matching product button (may be in icon or list mode)
  // Use exact title match to avoid matching "Copper ore" when searching "Copper"
  const productButton = page.locator(`button:has(img[title="${productName}" i])`).first();
  await productButton.waitFor({ state: 'visible', timeout: 5000 });
  await productButton.click();

  // Goal editor dialog appears — wait for the qty input
  const qtyInput = page.locator('input[name="qty"]');
  await qtyInput.waitFor({ state: 'visible' });

  // Set the quantity
  await qtyInput.fill(String(qty));

  // Save the goal
  await page.locator('button.addItemAsGoal').click();

  // Wait for the goal to appear in the sidebar
  await waitForGoalCount(page, initialGoalCount + 1);
}

/**
 * Add a producer for a goal via its context menu.
 * Assumes the goal is already visible in the sidebar.
 */
export async function addProducerFromGoal(page: Page, goalIndex: number) {
  // Click the goal to open its popover menu
  const goals = page.getByTestId('sidebar-goals-list').locator('.output-goal');
  await goals.nth(goalIndex).click();

  // Click "Add Producer"
  const menuItem = page.getByRole('button', { name: 'Add Producer' });
  await menuItem.waitFor({ state: 'visible' });
  await menuItem.click();
}
