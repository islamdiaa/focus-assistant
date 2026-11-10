import { test as base, expect } from "@playwright/test";

/**
 * Shared Playwright fixtures for Focus Assistant e2e tests.
 *
 * Home.tsx auto-opens the "Morning planning ritual" modal on app load when
 * the browser clock reads before noon and today's ritual isn't completed
 * (see client/src/pages/Home.tsx, `getHours() < 12`). A fresh e2e browser
 * never has a completed ritual, so every interaction test timed out behind
 * that modal whenever the suite ran before noon local time — CI runners are
 * UTC, so all runs between 00:00 and 11:59 UTC failed while evening runs
 * were green.
 *
 * We pin the browser's reported hour to the afternoon (morning hours are
 * shifted +12) so the ritual never auto-shows. The ritual component itself
 * stays covered by unit tests; e2e focuses on the always-visible UI.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      const realGetHours = Date.prototype.getHours;
      Date.prototype.getHours = function () {
        const h = realGetHours.call(this);
        return h < 12 ? h + 12 : h;
      };
    });
    await use(context);
  },
});

export { expect };
