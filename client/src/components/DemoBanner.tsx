/**
 * DemoBanner — small floating notice shown only in the hosted demo build.
 * Explains that changes stay in this browser, and offers a reset.
 */

import { resetDemo } from "@/lib/demo";

export default function DemoBanner() {
  return (
    <div
      role="note"
      aria-label="Demo notice"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 rounded-full border border-white/20 bg-foreground/90 px-4 py-2 text-xs text-background shadow-lg backdrop-blur-md max-w-[calc(100vw-7rem)]"
    >
      <span className="font-semibold">Demo</span>
      <span className="hidden sm:inline opacity-80">
        Changes are saved in this browser only
      </span>
      <button
        type="button"
        onClick={resetDemo}
        className="underline underline-offset-2 hover:opacity-80"
      >
        Reset
      </button>
      <a
        href="https://github.com/islamdiaa/focus-assistant"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
      >
        Get the app
      </a>
    </div>
  );
}
