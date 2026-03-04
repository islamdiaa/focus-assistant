import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Pure helper functions encapsulating session queue logic
// ---------------------------------------------------------------------------

interface Queue {
  count: number;
  autoChain: boolean;
}

function createQueue(initial = 0): Queue {
  return { count: initial, autoChain: false };
}

function increment(queue: Queue): Queue {
  return { ...queue, count: queue.count + 1 };
}

function decrement(queue: Queue): Queue {
  return { ...queue, count: Math.max(0, queue.count - 1) };
}

function setCount(queue: Queue, count: number): Queue {
  return { ...queue, count };
}

function setAutoChain(queue: Queue, enabled: boolean): Queue {
  return { ...queue, autoChain: enabled };
}

function shouldAutoStart(queue: Queue): boolean {
  return queue.autoChain && queue.count > 0;
}

// ---------------------------------------------------------------------------
// Break countdown helpers
// ---------------------------------------------------------------------------

interface BreakState {
  countdown: number | null;
}

function createBreakState(): BreakState {
  return { countdown: null };
}

function startBreakCountdown(): BreakState {
  return { countdown: 5 };
}

function tickCountdown(state: BreakState): BreakState {
  if (state.countdown === null) return state;
  return { countdown: state.countdown - 1 };
}

function isCountdownComplete(state: BreakState): boolean {
  return state.countdown !== null && state.countdown <= 0;
}

function clearCountdown(): BreakState {
  return { countdown: null };
}

// ---------------------------------------------------------------------------
// queue management
// ---------------------------------------------------------------------------

describe("Session Queue Logic", () => {
  describe("queue management", () => {
    it("initializes with zero queued sessions", () => {
      const queue = createQueue();
      expect(queue.count).toBe(0);
    });

    it("increments queue count", () => {
      const queue = increment(createQueue());
      expect(queue.count).toBe(1);
    });

    it("decrements queue count", () => {
      const queue = decrement(createQueue(3));
      expect(queue.count).toBe(2);
    });

    it("does not decrement below zero", () => {
      const atZero = createQueue(0);
      const result = decrement(atZero);
      expect(result.count).toBe(0);
    });

    it("can set queue to specific count", () => {
      const queue = setCount(createQueue(), 7);
      expect(queue.count).toBe(7);
    });
  });

  // ---------------------------------------------------------------------------
  // auto-chain behavior
  // ---------------------------------------------------------------------------

  describe("auto-chain behavior", () => {
    it("auto-chain defaults to off", () => {
      const queue = createQueue();
      expect(queue.autoChain).toBe(false);
    });

    it("when auto-chain off, completing session does not start next", () => {
      const queue = setCount(createQueue(3), 3); // autoChain is false
      expect(shouldAutoStart(queue)).toBe(false);
    });

    it("when auto-chain on and queue > 0, should trigger next session", () => {
      const queue = setAutoChain(createQueue(2), true);
      expect(shouldAutoStart(queue)).toBe(true);
    });

    it("when auto-chain on and queue === 0, should not trigger next session", () => {
      const queue = setAutoChain(createQueue(0), true);
      expect(shouldAutoStart(queue)).toBe(false);
    });

    it("decrement queue after triggering next session", () => {
      const queue = setAutoChain(createQueue(3), true);
      expect(shouldAutoStart(queue)).toBe(true);

      const afterTrigger = decrement(queue);
      expect(afterTrigger.count).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // break countdown
  // ---------------------------------------------------------------------------

  describe("break countdown", () => {
    it("break countdown starts at 5 seconds", () => {
      const state = startBreakCountdown();
      expect(state.countdown).toBe(5);
    });

    it("break countdown is null when not in break", () => {
      const state = createBreakState();
      expect(state.countdown).toBeNull();
    });

    it("break countdown reaches 0 then triggers next session", () => {
      let state = startBreakCountdown(); // 5

      expect(isCountdownComplete(state)).toBe(false);

      state = tickCountdown(state); // 4
      expect(isCountdownComplete(state)).toBe(false);

      state = tickCountdown(state); // 3
      state = tickCountdown(state); // 2
      state = tickCountdown(state); // 1
      state = tickCountdown(state); // 0

      expect(state.countdown).toBe(0);
      expect(isCountdownComplete(state)).toBe(true);

      // Simulate triggering next session and clearing countdown
      const cleared = clearCountdown();
      expect(cleared.countdown).toBeNull();
    });
  });
});
