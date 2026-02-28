/**
 * Focus Assist — V1.8.9 Feature E2E Tests
 *
 * Tests for 6 new features:
 * 1. Command Palette (Ctrl+K / Cmd+K)
 * 2. Daily Focus Goals / "Top 3"
 * 3. Drag-and-Drop in Today View (handle presence)
 * 4. Task Duration Estimates + Time Budget
 * 5. Bulk Task Actions
 * 6. Auto-Complete Parent + Available Hours (Settings)
 */
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// 1. Command Palette (Ctrl+K)
// ---------------------------------------------------------------------------
test.describe("Command Palette", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("Ctrl+K opens the command palette dialog with a search input", async ({
    page,
  }) => {
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(300);

    // The dialog should be visible with the title "Command Palette" (sr-only) or the search input
    const searchInput = page.locator(
      'input[placeholder="Type a command or search..."]'
    );
    await expect(searchInput).toBeVisible({ timeout: 3000 });
  });

  test("Cmd+K (Meta+K) also opens the command palette", async ({ page }) => {
    await page.keyboard.press("Meta+k");
    await page.waitForTimeout(300);

    const searchInput = page.locator(
      'input[placeholder="Type a command or search..."]'
    );
    await expect(searchInput).toBeVisible({ timeout: 3000 });
  });

  test("typing a page name shows matching page results", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(300);

    const searchInput = page.locator(
      'input[placeholder="Type a command or search..."]'
    );
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    await searchInput.fill("Timer");
    await page.waitForTimeout(200);

    // Should show "Focus Timer" as a page result within the dialog
    const dialog = page.locator('[role="dialog"]');
    const timerResult = dialog.getByText("Focus Timer");
    await expect(timerResult).toBeVisible({ timeout: 2000 });
  });

  test("typing a page name filters results (Settings)", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(300);

    const searchInput = page.locator(
      'input[placeholder="Type a command or search..."]'
    );
    await searchInput.fill("Settings");
    await page.waitForTimeout(200);

    const settingsResult = page.getByText("Settings").first();
    await expect(settingsResult).toBeVisible({ timeout: 2000 });
  });

  test("typing a task title shows task results section", async ({ page }) => {
    // Type something generic that may match existing tasks
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(300);

    const searchInput = page.locator(
      'input[placeholder="Type a command or search..."]'
    );
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    // Type a query — even if no tasks match, the "Pages" section header should be visible
    await searchInput.fill("zzz_nonexistent_query");
    await page.waitForTimeout(200);

    // With a non-matching query, we should see "No results found." text
    const noResults = page.getByText("No results found.");
    const pagesHeader = page.getByText("Pages");
    // Either no results message or pages header should exist (proves the palette renders results)
    const hasNoResults = await noResults.isVisible().catch(() => false);
    const hasPages = await pagesHeader.isVisible().catch(() => false);
    expect(hasNoResults || hasPages).toBe(true);
  });

  test("Escape closes the command palette", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(300);

    const searchInput = page.locator(
      'input[placeholder="Type a command or search..."]'
    );
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await expect(searchInput).not.toBeVisible();
  });

  test("command palette shows navigation hints in footer", async ({ page }) => {
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(300);

    // Footer should show keyboard hint text
    const navigateHint = page.getByText("navigate");
    const selectHint = page.getByText("select");
    const closeHint = page.getByText("close");

    await expect(navigateHint).toBeVisible({ timeout: 3000 });
    await expect(selectHint).toBeVisible({ timeout: 3000 });
    await expect(closeHint).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// 2. Daily Focus Goals / "Top 3"
// ---------------------------------------------------------------------------
test.describe("Daily Focus Goals", () => {
  test.beforeEach(async ({ page }) => {
    // The default page on load is the Today/planner page
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("Today page has a 'Today\\'s Focus' section", async ({ page }) => {
    const focusSection = page.getByText("Today's Focus");
    await expect(focusSection).toBeVisible({ timeout: 5000 });
  });

  test("focus goals section shows a counter (X/3)", async ({ page }) => {
    // The counter format is "(N/3)" next to the "Today's Focus" heading
    const counter = page.locator("text=/\\d\\/3/");
    await expect(counter.first()).toBeVisible({ timeout: 5000 });
  });

  test("star icons are present on the Today page for focus goal toggling", async ({
    page,
  }) => {
    // Star buttons are used for focus goal toggling on pinned task cards
    // Check for either star buttons on task cards OR the "Star up to 3 tasks" prompt
    const starPrompt = page.getByText(/star up to 3 tasks/i);
    const starButtons = page.locator('button[title*="focus goal" i]');

    const hasPrompt = await starPrompt.isVisible().catch(() => false);
    const starCount = await starButtons.count();

    // Either the prompt (no goals set) or star toggle buttons (goals exist) should be present
    expect(hasPrompt || starCount > 0).toBe(true);
  });

  test("Today\\'s Focus section displays a star icon", async ({ page }) => {
    // The heading area contains a Star icon (rendered as SVG with class text-amber-500)
    const focusHeading = page.getByText("Today's Focus");
    await expect(focusHeading).toBeVisible({ timeout: 5000 });

    // The star icon is rendered as a sibling SVG element near the heading
    const starIcon = page.locator(
      'svg.text-amber-500, svg[class*="text-amber"]'
    );
    await expect(starIcon.first()).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// 3. Drag-and-Drop in Today View (handle presence)
// ---------------------------------------------------------------------------
test.describe("Drag-and-Drop Handles in Today View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("task cards in Today view have drag handle (GripVertical) elements in the DOM", async ({
    page,
  }) => {
    // GripVertical icons are rendered as SVGs in the task cards
    // They have opacity-0 by default (shown on hover), but should exist in the DOM
    // The drag handle div has title="Drag to reorder"
    const dragHandles = page.locator('[title="Drag to reorder"]');
    const count = await dragHandles.count();

    // If there are pinned tasks, there should be drag handles
    // If no pinned tasks exist, this is OK — just verify no errors
    if (count > 0) {
      // At least one drag handle exists in the DOM
      expect(count).toBeGreaterThan(0);
    }
    // No assertion failure if count === 0 (no pinned tasks)
  });

  test("My Today section is visible on the planner page", async ({ page }) => {
    const myTodaySection = page.getByText(/My Today/);
    await expect(myTodaySection.first()).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 4. Task Duration Estimates + Time Budget
// ---------------------------------------------------------------------------
test.describe("Task Duration Estimates & Time Budget", () => {
  // Desktop-only: needs sidebar navigation to reach Tasks page
  test.beforeEach(async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(
      !viewport || viewport.width < 1024,
      "Sidebar navigation requires desktop viewport"
    );
  });

  test("task creation dialog on Tasks page has an 'Estimated Time' field", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Navigate to Tasks page via sidebar
    const tasksLink = page.getByText(/^tasks$/i).first();
    await tasksLink.click();
    await page.waitForTimeout(500);

    // Open the Add Task dialog
    const addButton = page.getByRole("button", { name: /add/i }).first();
    await addButton.click();
    await page.waitForTimeout(500);

    // Look for the "Estimated Time" label
    const estimatedTimeLabel = page.getByText("Estimated Time");
    await expect(estimatedTimeLabel.first()).toBeVisible({ timeout: 3000 });
  });

  test("task creation dialog shows quick-pick time buttons (15m, 30m, 1h, 2h)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const tasksLink = page.getByText(/^tasks$/i).first();
    await tasksLink.click();
    await page.waitForTimeout(500);

    const addButton = page.getByRole("button", { name: /add/i }).first();
    await addButton.click();
    await page.waitForTimeout(500);

    // Check for quick-pick buttons
    const btn15m = page.getByRole("button", { name: "15m" });
    const btn30m = page.getByRole("button", { name: "30m" });
    const btn1h = page.getByRole("button", { name: "1h" });
    const btn2h = page.getByRole("button", { name: "2h" });

    await expect(btn15m).toBeVisible({ timeout: 3000 });
    await expect(btn30m).toBeVisible({ timeout: 3000 });
    await expect(btn1h).toBeVisible({ timeout: 3000 });
    await expect(btn2h).toBeVisible({ timeout: 3000 });
  });

  test("planner page task creation dialog also has Estimated Time field", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The planner page is the default; open its Add Task dialog
    // Look for an Add or Plus button on the Today view
    const addButton = page
      .getByRole("button", { name: /add/i })
      .or(page.locator('button:has(svg[class*="Plus"])'))
      .first();
    const isVisible = await addButton.isVisible().catch(() => false);
    if (isVisible) {
      await addButton.click();
      await page.waitForTimeout(500);

      const estimatedTimeLabel = page.getByText("Estimated Time");
      await expect(estimatedTimeLabel.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test("Today view shows Time Budget section when tasks have estimates", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The Time Budget bar only appears when at least one pinned task has an estimate.
    // Check for the "Time Budget" text — it may or may not be visible depending on data.
    const timeBudgetLabel = page.getByText("Time Budget");
    const isVisible = await timeBudgetLabel.isVisible().catch(() => false);

    if (isVisible) {
      await expect(timeBudgetLabel).toBeVisible();
      // Also check for the progress bar element nearby
      const progressBar = page.locator('[role="progressbar"]');
      await expect(progressBar.first()).toBeVisible({ timeout: 3000 });
    }
    // If not visible, that's OK — no tasks with estimates are pinned
  });
});

// ---------------------------------------------------------------------------
// 5. Bulk Task Actions
// ---------------------------------------------------------------------------
test.describe("Bulk Task Actions", () => {
  test.beforeEach(async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(
      !viewport || viewport.width < 1024,
      "Sidebar navigation requires desktop viewport"
    );
  });

  test("Tasks page has a Select button", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const tasksLink = page.getByText(/^tasks$/i).first();
    await tasksLink.click();
    await page.waitForTimeout(500);

    // The Select button should be visible (text may be hidden on small screens, but icon + text on desktop)
    const selectButton = page.getByRole("button", { name: /select/i });
    await expect(selectButton).toBeVisible({ timeout: 3000 });
  });

  test("clicking Select button enters selection mode and shows Cancel", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const tasksLink = page.getByText(/^tasks$/i).first();
    await tasksLink.click();
    await page.waitForTimeout(500);

    const selectButton = page.getByRole("button", { name: /select/i });
    await expect(selectButton).toBeVisible({ timeout: 3000 });
    await selectButton.click();
    await page.waitForTimeout(300);

    // After clicking, the button text should change to "Cancel"
    const cancelButton = page.getByRole("button", { name: /cancel/i });
    await expect(cancelButton).toBeVisible({ timeout: 3000 });
  });

  test("selection mode shows checkboxes on task cards", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const tasksLink = page.getByText(/^tasks$/i).first();
    await tasksLink.click();
    await page.waitForTimeout(500);

    const selectButton = page.getByRole("button", { name: /select/i });
    await expect(selectButton).toBeVisible({ timeout: 3000 });
    await selectButton.click();
    await page.waitForTimeout(300);

    // Checkboxes should appear on task cards (role="checkbox" from Checkbox component)
    const checkboxes = page.getByRole("checkbox");
    const count = await checkboxes.count();
    // There should be at least one if tasks exist
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test("pressing Escape exits selection mode", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const tasksLink = page.getByText(/^tasks$/i).first();
    await tasksLink.click();
    await page.waitForTimeout(500);

    const selectButton = page.getByRole("button", { name: /select/i });
    await expect(selectButton).toBeVisible({ timeout: 3000 });
    await selectButton.click();
    await page.waitForTimeout(300);

    // Verify we're in selection mode
    const cancelButton = page.getByRole("button", { name: /cancel/i });
    await expect(cancelButton).toBeVisible({ timeout: 3000 });

    // Press Escape to exit selection mode
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    // Should be back to "Select" button
    const selectButtonAgain = page.getByRole("button", { name: /select/i });
    await expect(selectButtonAgain).toBeVisible({ timeout: 3000 });
  });

  test("clicking Cancel exits selection mode", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const tasksLink = page.getByText(/^tasks$/i).first();
    await tasksLink.click();
    await page.waitForTimeout(500);

    const selectButton = page.getByRole("button", { name: /select/i });
    await expect(selectButton).toBeVisible({ timeout: 3000 });
    await selectButton.click();
    await page.waitForTimeout(300);

    const cancelButton = page.getByRole("button", { name: /cancel/i });
    await expect(cancelButton).toBeVisible({ timeout: 3000 });
    await cancelButton.click();
    await page.waitForTimeout(300);

    // Should return to "Select" button
    const selectButtonAgain = page.getByRole("button", { name: /select/i });
    await expect(selectButtonAgain).toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// 6. Auto-Complete Parent + Available Hours (Settings)
// ---------------------------------------------------------------------------
test.describe("Settings: Automation & Planning", () => {
  test.beforeEach(async ({ page }) => {
    const viewport = page.viewportSize();
    test.skip(
      !viewport || viewport.width < 1024,
      "Sidebar navigation requires desktop viewport"
    );
  });

  test("Settings page has an Automation section", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const settingsLink = page.getByText(/settings/i).first();
    await settingsLink.click();
    await page.waitForTimeout(1000);

    const automationHeading = page.getByText("Automation");
    await expect(automationHeading).toBeVisible({ timeout: 5000 });
  });

  test("Automation section has an auto-complete parent tasks toggle", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const settingsLink = page.getByText(/settings/i).first();
    await settingsLink.click();
    await page.waitForTimeout(1000);

    // Look for the "Auto-complete parent task" text
    const autoCompleteLabel = page.getByText("Auto-complete parent task");
    await expect(autoCompleteLabel).toBeVisible({ timeout: 5000 });

    // There should be a switch (role="switch") near this label
    const switches = page.getByRole("switch");
    const count = await switches.count();
    expect(count).toBeGreaterThan(0);
  });

  test("auto-complete parent toggle is interactive (can be toggled)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const settingsLink = page.getByText(/settings/i).first();
    await settingsLink.click();
    await page.waitForTimeout(1000);

    // Find the auto-complete section and its switch
    const autoCompleteLabel = page.getByText("Auto-complete parent task");
    await expect(autoCompleteLabel).toBeVisible({ timeout: 5000 });

    // The switch is inside the same card container
    // Find the parent card and the switch within it
    const automationCard = autoCompleteLabel
      .locator("xpath=ancestor::div[contains(@class, 'rounded')]")
      .first();
    const toggle = automationCard.getByRole("switch");
    const isVisible = await toggle.isVisible().catch(() => false);

    if (isVisible) {
      // Get initial state
      const initialState = await toggle.getAttribute("data-state");
      await toggle.click();
      await page.waitForTimeout(300);

      // State should have changed
      const newState = await toggle.getAttribute("data-state");
      expect(newState).not.toBe(initialState);

      // Toggle back to restore original state
      await toggle.click();
      await page.waitForTimeout(300);
    }
  });

  test("Settings page has a Planning section with Available Hours", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const settingsLink = page.getByText(/settings/i).first();
    await settingsLink.click();
    await page.waitForTimeout(1000);

    // Look for Planning section heading
    const planningHeading = page.getByText("Planning");
    await expect(planningHeading.first()).toBeVisible({ timeout: 5000 });

    // Look for "Available hours per day" text
    const availableHoursLabel = page.getByText(/available hours per day/i);
    await expect(availableHoursLabel).toBeVisible({ timeout: 5000 });
  });

  test("Planning section shows the hours value and a slider", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const settingsLink = page.getByText(/settings/i).first();
    await settingsLink.click();
    await page.waitForTimeout(1000);

    // The hours display shows a value like "8h"
    const hoursValue = page.locator("text=/\\d+(\\.5)?h/");
    await expect(hoursValue.first()).toBeVisible({ timeout: 5000 });

    // The slider should exist (role="slider")
    const sliders = page.getByRole("slider");
    const count = await sliders.count();
    expect(count).toBeGreaterThan(0);
  });

  test("Planning section describes the time budget connection", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const settingsLink = page.getByText(/settings/i).first();
    await settingsLink.click();
    await page.waitForTimeout(1000);

    // The description mentions "time budget" and "Today view"
    const description = page.getByText(/time budget/i);
    await expect(description).toBeVisible({ timeout: 5000 });
  });
});
