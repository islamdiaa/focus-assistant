/**
 * usePreferences — domain hook for reading and updating app preferences.
 *
 * Provides a clean read/write API over the preferences slice of AppState
 * so callers never need to interact with dispatch or know the action type.
 * This hook is purely additive: it does not modify AppContext or change
 * the provider tree. Existing code using state.preferences directly
 * continues to work unchanged.
 *
 * Usage:
 *   const { preferences, updatePreferences } = usePreferences();
 *   updatePreferences({ notificationSound: "bell" });
 */

import { useApp } from "@/contexts/AppContext";
import { DEFAULT_PREFERENCES } from "@/lib/types";
import type { AppPreferences } from "@/lib/types";

/**
 * Returns the current app preferences and a stable function to update
 * them. Partial updates are merged with the existing preferences; only
 * the fields you pass are changed.
 *
 * `preferences` is always a fully resolved object — it falls back to
 * DEFAULT_PREFERENCES when the stored value is null or undefined, so
 * callers never need to handle undefined preference fields.
 */
export function usePreferences(): {
  preferences: AppPreferences;
  updatePreferences: (prefs: Partial<AppPreferences>) => void;
} {
  const { state, dispatch } = useApp();

  const preferences: AppPreferences = state.preferences ?? DEFAULT_PREFERENCES;

  const updatePreferences = (prefs: Partial<AppPreferences>) =>
    dispatch({ type: "UPDATE_PREFERENCES", payload: prefs });

  return { preferences, updatePreferences };
}
