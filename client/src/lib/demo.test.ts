import { describe, expect, it } from "vitest";
import { appStateSchema } from "@shared/appTypes";
import { buildDemoState, demoMarkdown } from "./demo";

describe("demo mode sample data", () => {
  it("is a valid app state", () => {
    expect(() => appStateSchema.parse(buildDemoState())).not.toThrow();
  });

  it("pins today's focus goals to today", () => {
    const today = new Date().toISOString().slice(0, 10);
    const pinned = buildDemoState().tasks.filter(t => t.pinnedToday === today);
    expect(pinned.length).toBeGreaterThan(0);
  });

  it("exports tasks as a Markdown checklist", () => {
    const md = demoMarkdown(buildDemoState());
    expect(md).toContain("- [x] Go for a run");
    expect(md).toContain("- [ ] Write the project proposal");
  });
});
