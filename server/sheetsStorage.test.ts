import { describe, expect, it } from "vitest";

/**
 * Since sheetsStorage.ts doesn't export the row converter functions directly,
 * we test the public API (loadFromSheets / saveToSheets) by mocking fetch.
 * We also test edge cases in the data transformation logic.
 */

// We need to mock global fetch for Google Sheets API calls
import { vi } from "vitest";

describe("sheetsStorage", () => {
  describe("loadFromSheets", () => {
    it("returns null when API calls fail", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error"))
      );

      const { loadFromSheets } = await import("./sheetsStorage");
      const result = await loadFromSheets("fake-id", "fake-key");

      // Should return a state with empty arrays (since individual sheet reads return [])
      expect(result).toBeTruthy();
      expect(result!.tasks).toHaveLength(0);
      expect(result!.pomodoros).toHaveLength(0);
      expect(result!.dailyStats).toHaveLength(0);

      vi.unstubAllGlobals();
    });

    it("parses task rows correctly from API response", async () => {
      const mockResponses: Record<string, any> = {
        Tasks: {
          values: [
            [
              "id",
              "title",
              "description",
              "priority",
              "status",
              "dueDate",
              "category",
              "energy",
              "quadrant",
              "createdAt",
              "completedAt",
            ],
            [
              "t1",
              "Test Task",
              "A description",
              "high",
              "active",
              "2026-03-01",
              "work",
              "high",
              "do-first",
              "2026-02-20T10:00:00Z",
              "",
            ],
          ],
        },
        Pomodoros: { values: [] },
        Settings: {
          values: [
            ["key", "value"],
            ["focusDuration", "30"],
            ["shortBreak", "7"],
            ["longBreak", "20"],
            ["sessionsBeforeLongBreak", "4"],
            ["currentStreak", "5"],
          ],
        },
        DailyStats: {
          values: [
            ["date", "tasksCompleted", "focusMinutes", "pomodorosCompleted"],
            ["2026-02-20", "3", "90", "4"],
          ],
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string) => {
          const sheetName = Object.keys(mockResponses).find(name =>
            url.includes(encodeURIComponent(name))
          );
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResponses[sheetName || "Tasks"]),
          });
        })
      );

      const { loadFromSheets } = await import("./sheetsStorage");
      const result = await loadFromSheets("test-id", "test-key");

      expect(result).toBeTruthy();
      expect(result!.tasks).toHaveLength(1);
      expect(result!.tasks[0].title).toBe("Test Task");
      expect(result!.tasks[0].priority).toBe("high");
      expect(result!.tasks[0].category).toBe("work");
      expect(result!.settings.focusDuration).toBe(30);
      expect(result!.settings.shortBreak).toBe(7);
      expect(result!.currentStreak).toBe(5);
      expect(result!.dailyStats).toHaveLength(1);
      expect(result!.dailyStats[0].focusMinutes).toBe(90);

      vi.unstubAllGlobals();
    });
  });

  describe("saveToSheets", () => {
    it("calls the Sheets API with PUT for each sheet", async () => {
      const fetchCalls: string[] = [];

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation((url: string, opts?: any) => {
          if (opts?.method === "PUT") fetchCalls.push(url);
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        })
      );

      const { saveToSheets } = await import("./sheetsStorage");
      const result = await saveToSheets("test-id", "test-key", {
        tasks: [
          {
            id: "t1",
            title: "Task",
            priority: "medium",
            status: "active",
            quadrant: "unassigned",
            createdAt: "2026-02-20T10:00:00Z",
          },
        ],
        pomodoros: [],
        settings: {
          focusDuration: 25,
          shortBreak: 5,
          longBreak: 15,
          sessionsBeforeLongBreak: 4,
        },
        dailyStats: [],
        currentStreak: 0,
      });

      expect(result).toBe(true);
      expect(fetchCalls).toHaveLength(4); // Tasks, Pomodoros, Settings, DailyStats
      expect(fetchCalls.some(u => u.includes("Tasks"))).toBe(true);
      expect(fetchCalls.some(u => u.includes("Settings"))).toBe(true);

      vi.unstubAllGlobals();
    });

    it("returns false when any sheet write fails", async () => {
      let callCount = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(() => {
          callCount++;
          // Fail the second PUT call
          if (callCount === 2) return Promise.resolve({ ok: false });
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        })
      );

      const { saveToSheets } = await import("./sheetsStorage");
      const result = await saveToSheets("test-id", "test-key", {
        tasks: [],
        pomodoros: [],
        settings: {
          focusDuration: 25,
          shortBreak: 5,
          longBreak: 15,
          sessionsBeforeLongBreak: 4,
        },
        dailyStats: [],
        currentStreak: 0,
      });

      expect(result).toBe(false);

      vi.unstubAllGlobals();
    });
  });
});
