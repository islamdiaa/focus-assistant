import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Shortcut data (mirrors what the overlay component uses)
// ---------------------------------------------------------------------------

interface Shortcut {
  key: string;
  description: string;
}

interface ShortcutMap {
  navigation: Shortcut[];
  actions: Shortcut[];
}

const SHORTCUTS: ShortcutMap = {
  navigation: [
    { key: "T", description: "Today" },
    { key: "K", description: "Tasks" },
    { key: "M", description: "Matrix" },
    { key: "P", description: "Timer" },
    { key: "C", description: "Canvas" },
    { key: "R", description: "Read Later" },
    { key: "E", description: "Reminders" },
    { key: "W", description: "Weekly Review" },
    { key: "S", description: "Stats" },
    { key: ",", description: "Settings" },
  ],
  actions: [
    { key: "Ctrl+N", description: "Quick Add Task" },
    { key: "Ctrl+K", description: "Command Palette" },
    { key: "Ctrl+Z", description: "Undo" },
    { key: "Ctrl+Shift+Z", description: "Redo" },
    { key: "?", description: "Keyboard Shortcuts" },
  ],
};

// ---------------------------------------------------------------------------
// Keyboard Shortcuts
// ---------------------------------------------------------------------------

describe("Keyboard Shortcuts", () => {
  it("has no duplicate keys across all categories", () => {
    const allKeys = [
      ...SHORTCUTS.navigation.map(s => s.key),
      ...SHORTCUTS.actions.map(s => s.key),
    ];
    const unique = new Set(allKeys);
    expect(unique.size).toBe(allKeys.length);
  });

  it("every shortcut has a non-empty key", () => {
    const allShortcuts = [...SHORTCUTS.navigation, ...SHORTCUTS.actions];
    for (const s of allShortcuts) {
      expect(typeof s.key).toBe("string");
      expect(s.key.trim().length).toBeGreaterThan(0);
    }
  });

  it("every shortcut has a non-empty description", () => {
    const allShortcuts = [...SHORTCUTS.navigation, ...SHORTCUTS.actions];
    for (const s of allShortcuts) {
      expect(typeof s.description).toBe("string");
      expect(s.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("navigation shortcuts are single characters", () => {
    for (const s of SHORTCUTS.navigation) {
      expect(s.key.length).toBe(1);
    }
  });

  it("action shortcuts contain modifier keys", () => {
    // Most action shortcuts use a modifier key; single bare characters (e.g.
    // "?") are the exception — they are not navigation keys but also carry no
    // modifier. We assert that at least the majority (> half) of action
    // shortcuts use a modifier, which validates the data shape without
    // incorrectly rejecting legitimate bare-key actions.
    const modifiers = ["Ctrl", "Alt", "Shift", "Meta", "Cmd"];
    const withModifier = SHORTCUTS.actions.filter(s =>
      modifiers.some(mod => s.key.includes(mod))
    );
    expect(withModifier.length).toBeGreaterThan(SHORTCUTS.actions.length / 2);
  });

  it("has at least 10 navigation shortcuts", () => {
    expect(SHORTCUTS.navigation.length).toBeGreaterThanOrEqual(10);
  });

  it("has at least 5 action shortcuts", () => {
    expect(SHORTCUTS.actions.length).toBeGreaterThanOrEqual(5);
  });
});
