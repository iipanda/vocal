import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export type AppStatus = 
  | "Listening..." 
  | "Recording..." 
  | "Transcribing..." 
  | "Refining prompt..." 
  | "✓ Copied to clipboard!" 
  | "Configuration needed"
  | "Error occurred";

export interface AppState {
  status: AppStatus;
  error: string | null;
  isVisible: boolean;
}

export function useAppState() {
  const [state, setState] = useState<AppState>({
    status: "Listening...",
    error: null,
    isVisible: false,
  });

  const setStatus = (status: AppStatus) => {
    setState(prev => ({ ...prev, status }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const setVisible = (isVisible: boolean) => {
    setState(prev => ({ ...prev, isVisible }));
  };

  const resetState = () => {
    setState({
      status: "Listening...",
      error: null,
      isVisible: false,
    });
  };

  const hideWindow = async () => {
    try {
      await invoke("hide_dictation_window");
      setVisible(false);
    } catch (error) {
      console.error("Failed to hide window:", error);
    }
  };

  const showSettings = async () => {
    try {
      await invoke("show_settings_window");
    } catch (error) {
      console.error("Failed to show settings:", error);
      setError("Failed to open settings window");
    }
  };

  useEffect(() => {
    // Listen for start recording events
    const unlistenStart = listen("start-recording", () => {
      setStatus("Listening...");
      setError(null);
      setVisible(true);
    });

    // Listen for abort recording events
    const unlistenAbort = listen("abort-recording", () => {
      resetState();
    });

    return () => {
      unlistenStart.then(fn => fn());
      unlistenAbort.then(fn => fn());
    };
  }, []);

  return {
    ...state,
    setStatus,
    setError,
    setVisible,
    resetState,
    hideWindow,
    showSettings,
  };
}