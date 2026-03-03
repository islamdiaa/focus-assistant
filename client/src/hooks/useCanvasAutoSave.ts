import { useRef, useCallback, useEffect, useState } from "react";

interface PendingData {
  content: string;
  wordCount: number;
}

interface AutoSaveOptions {
  date: string;
  dispatch: React.Dispatch<any>;
}

interface AutoSaveReturn {
  handleUpdate: (data: { content: string; wordCount: number }) => void;
  saveStatus: "saved" | "saving" | "unsaved";
  flush: () => void;
}

const DEBOUNCE_MS = 1000;
const INTERVAL_MS = 15_000;
const SAVING_INDICATOR_MS = 300;

export function useCanvasAutoSave({
  date,
  dispatch,
}: AutoSaveOptions): AutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">(
    "saved"
  );

  const pendingRef = useRef<PendingData | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateRef = useRef(date);

  // Keep dateRef current
  dateRef.current = date;

  const doSave = useCallback(
    (forDate: string) => {
      const data = pendingRef.current;
      if (!data) return;

      pendingRef.current = null;
      setSaveStatus("saving");

      dispatch({
        type: "SET_CANVAS_ENTRY",
        payload: {
          date: forDate,
          content: data.content,
          wordCount: data.wordCount,
        },
      });

      // Clear any existing saving indicator timer
      if (savingTimerRef.current) {
        clearTimeout(savingTimerRef.current);
      }
      savingTimerRef.current = setTimeout(() => {
        setSaveStatus("saved");
        savingTimerRef.current = null;
      }, SAVING_INDICATOR_MS);
    },
    [dispatch]
  );

  const flush = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    doSave(dateRef.current);
  }, [doSave]);

  const handleUpdate = useCallback(
    (data: { content: string; wordCount: number }) => {
      pendingRef.current = data;
      setSaveStatus("unsaved");

      // Reset debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        doSave(dateRef.current);
        debounceRef.current = null;
      }, DEBOUNCE_MS);
    },
    [doSave]
  );

  // Flush pending data when date changes
  const prevDateRef = useRef(date);
  useEffect(() => {
    if (prevDateRef.current !== date && pendingRef.current) {
      // Flush data for the *previous* date
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      doSave(prevDateRef.current);
    }
    prevDateRef.current = date;
    setSaveStatus("saved");
  }, [date, doSave]);

  // Interval save (every 30s)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (pendingRef.current) {
        doSave(dateRef.current);
      }
    }, INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [doSave]);

  // Flush on blur/visibilitychange
  useEffect(() => {
    const handleBlur = () => {
      if (pendingRef.current) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        doSave(dateRef.current);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && pendingRef.current) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        doSave(dateRef.current);
      }
    };

    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [doSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (savingTimerRef.current) clearTimeout(savingTimerRef.current);
      // Final flush on unmount
      if (pendingRef.current) {
        doSave(dateRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { handleUpdate, saveStatus, flush };
}
