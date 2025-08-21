import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export type AppStatus = 
  | "Listening..." 
  | "Recording..." 
  | "Transcribing..." 
  | "Refining prompt..." 
  | "Sending to Claude Code..."
  | "✓ Copied to clipboard!" 
  | "✓ Sent to Claude Code!"
  | "Configuration needed"
  | "Error occurred";

export interface HandsFreeState {
  isActive: boolean;
  cycleCount: number;
  autoApprovalCount: number;
  lastCycleTime: Date | null;
  emergencyStopTriggered: boolean;
  currentPhase: 'idle' | 'recording' | 'processing' | 'error';
}

export interface AppState {
  status: AppStatus;
  error: string | null;
  isVisible: boolean;
  handsFreeMode: HandsFreeState;
}

export function useAppState() {
  const [state, setState] = useState<AppState>({
    status: "Listening...",
    error: null,
    isVisible: false,
    handsFreeMode: {
      isActive: false,
      cycleCount: 0,
      autoApprovalCount: 0,
      lastCycleTime: null,
      emergencyStopTriggered: false,
      currentPhase: 'idle',
    },
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
    setState(prev => ({
      status: "Listening...",
      error: null,
      isVisible: false,
      handsFreeMode: {
        ...prev.handsFreeMode,
        currentPhase: 'idle',
      },
    }));
  };

  const setHandsFreeMode = (updates: Partial<HandsFreeState>) => {
    setState(prev => ({
      ...prev,
      handsFreeMode: { ...prev.handsFreeMode, ...updates },
    }));
  };

  const activateHandsFreeMode = async () => {
    try {
      await invoke("activate_hands_free_mode");
      setHandsFreeMode({ 
        isActive: true, 
        currentPhase: 'idle',
        emergencyStopTriggered: false 
      });
    } catch (error) {
      console.error("Failed to activate hands-free mode:", error);
      setError("Failed to activate hands-free mode");
    }
  };

  const deactivateHandsFreeMode = async () => {
    try {
      await invoke("deactivate_hands_free_mode");
      setHandsFreeMode({ 
        isActive: false, 
        currentPhase: 'idle',
        cycleCount: 0 
      });
    } catch (error) {
      console.error("Failed to deactivate hands-free mode:", error);
      setError("Failed to deactivate hands-free mode");
    }
  };

  const triggerEmergencyStop = async () => {
    try {
      await invoke("trigger_emergency_stop");
      setHandsFreeMode({ 
        isActive: false, 
        emergencyStopTriggered: true,
        currentPhase: 'error' 
      });
    } catch (error) {
      console.error("Failed to trigger emergency stop:", error);
    }
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
      if (state.handsFreeMode.isActive) {
        setHandsFreeMode({ currentPhase: 'recording' });
      }
    });

    // Listen for abort recording events
    const unlistenAbort = listen("abort-recording", () => {
      resetState();
    });

    // Listen for restart recording events (hands-free mode)
    const unlistenRestart = listen("restart-recording", async () => {
      if (state.handsFreeMode.isActive) {
        setHandsFreeMode({ 
          currentPhase: 'recording',
          cycleCount: state.handsFreeMode.cycleCount + 1,
          lastCycleTime: new Date(),
        });
        setStatus("Listening...");
        setError(null);
        setVisible(true);
      }
    });

    return () => {
      unlistenStart.then(fn => fn());
      unlistenAbort.then(fn => fn());
      unlistenRestart.then(fn => fn());
    };
  }, [state.handsFreeMode.isActive, state.handsFreeMode.cycleCount]);

  // Cycle trigger checking
  useEffect(() => {
    if (!state.handsFreeMode.isActive) return;

    const checkCycleTrigger = async () => {
      try {
        const triggered = await invoke("check_cycle_trigger") as boolean;
        if (triggered) {
          console.log("Cycle trigger detected - recording will restart");
        }
      } catch (error) {
        console.error("Failed to check cycle trigger:", error);
      }
    };

    const interval = setInterval(checkCycleTrigger, 1000);
    return () => clearInterval(interval);
  }, [state.handsFreeMode.isActive]);

  return {
    ...state,
    setStatus,
    setError,
    setVisible,
    resetState,
    hideWindow,
    showSettings,
    setHandsFreeMode,
    activateHandsFreeMode,
    deactivateHandsFreeMode,
    triggerEmergencyStop,
  };
}