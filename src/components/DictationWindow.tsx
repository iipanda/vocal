import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

import { AudioVisualizer } from "@/components/ui/audio-visualizer";
import { HandsFreeControls } from "@/components/HandsFreeControls";
import { useAppState } from "@/hooks/use-app-state";
import { useConfig } from "@/hooks/use-config";
import { useRecording } from "@/hooks/use-recording";
import { apiService } from "@/services/api";
import { handleError } from "@/utils/error-handler";

export function DictationWindow() {
  const appState = useAppState();
  const { config, isConfigured } = useConfig();
  const recording = useRecording({
    onTranscriptionStart: () => appState.setStatus("Transcribing..."),
    onError: (error) => {
      appState.setError(error);
      appState.setStatus("Error occurred");
    },
  });

  const recordingStateRef = useRef({
    isRecording: recording.isRecording,
    isTranscribing: recording.isTranscribing,
  });

  const stopRecordingRef = useRef(recording.stopRecording);
  const cleanupRecordingRef = useRef(recording.cleanup);

  // Update refs when recording state changes
  useEffect(() => {
    recordingStateRef.current = {
      isRecording: recording.isRecording,
      isTranscribing: recording.isTranscribing,
    };
    stopRecordingRef.current = recording.stopRecording;
    cleanupRecordingRef.current = recording.cleanup;
  }, [recording.isRecording, recording.isTranscribing, recording.stopRecording, recording.cleanup]);

  // Handle transcription workflow
  const handleTranscription = async (audioBlob: Blob) => {
    try {
      if (appState.handsFreeMode.isActive) {
        appState.setHandsFreeMode({ currentPhase: 'processing' });
      }

      appState.setStatus("Transcribing...");
      const audioData = new Uint8Array(await audioBlob.arrayBuffer());
      
      const transcribedText = await apiService.transcribeAudio({
        audioData,
        apiKey: config.groqApiKey,
      });

      appState.setStatus("Refining prompt...");
      const refinedPrompt = await apiService.refinePrompt({
        text: transcribedText,
        apiKey: config.anthropicApiKey,
        systemPrompt: config.systemPrompt,
      });

      if (appState.handsFreeMode.isActive) {
        // Inject into Claude Code session
        appState.setStatus("Sending to Claude Code...");
        await invoke("inject_prompt_to_claude_session", { prompt: refinedPrompt });
        appState.setStatus("✓ Sent to Claude Code!");
        
        appState.setHandsFreeMode({ 
          currentPhase: 'processing',
          autoApprovalCount: appState.handsFreeMode.autoApprovalCount + 1 
        });

        setTimeout(() => {
          appState.hideWindow();
        }, 1500);
      } else {
        // Normal clipboard workflow
        await invoke("copy_to_clipboard", { text: refinedPrompt });
        appState.setStatus("✓ Copied to clipboard!");

        setTimeout(() => {
          appState.hideWindow();
        }, 2000);
      }
    } catch (error) {
      const { message } = handleError(error);
      appState.setError(message);
      appState.setStatus("Error occurred");
      
      if (appState.handsFreeMode.isActive) {
        appState.setHandsFreeMode({ currentPhase: 'error' });
      }
    }
  };

  // Handle start recording events
  useEffect(() => {
    const unlistenStart = listen("start-recording", async () => {
      appState.setStatus("Listening...");
      appState.setError(null);
      
      if (!isConfigured()) {
        appState.setError("API keys not configured. Open Settings to configure your Groq and Anthropic API keys.");
        appState.setStatus("Configuration needed");
        return;
      }
      
      if (!recordingStateRef.current.isRecording && !recordingStateRef.current.isTranscribing) {
        await recording.startRecording();
        appState.setStatus("Recording...");
      }
    });

    const unlistenAbort = listen("abort-recording", () => {
      if (recordingStateRef.current.isRecording || recordingStateRef.current.isTranscribing) {
        cleanupRecordingRef.current();
      }
      appState.resetState();
    });

    return () => {
      unlistenStart.then(fn => fn());
      unlistenAbort.then(fn => fn());
    };
  }, [isConfigured, recording, appState]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (recordingStateRef.current.isRecording || recordingStateRef.current.isTranscribing) {
          cleanupRecordingRef.current();
        }
        appState.resetState();
        appState.hideWindow();
      } else if (event.key === "Enter" || event.key === "Return") {
        if (recordingStateRef.current.isRecording && !recordingStateRef.current.isTranscribing) {
          stopRecordingRef.current().then(blob => {
            if (blob) {
              handleTranscription(blob);
            }
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appState]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        {/* Main recording interface */}
        <div className="relative w-96 rounded-2xl border border-white/10 bg-black p-6 shadow-2xl">
        {/* Fixed height status area */}
        <div className="mb-2 text-center h-4 flex items-center justify-center">
          <p className="text-sm text-white/70">{appState.status}</p>
        </div>

        {/* Fixed height error area */}
        <div className="mb-2 h-6 flex items-center justify-center">
          {appState.error && (
            <div className="w-full rounded border border-destructive/20 bg-destructive/10 px-2 py-1 text-xs text-destructive text-center">
              {appState.error}
            </div>
          )}
        </div>

        {/* Audio visualizer */}
        <div className="mb-3 h-20">
          <AudioVisualizer
            stream={recording.audioStream}
            isRecording={recording.isRecording}
          />
        </div>

        {/* Fixed height instruction area */}
        <div className="h-6 flex items-center justify-center">
          {appState.error ? (
            <button
              onClick={appState.showSettings}
              className="text-center text-blue-400 hover:text-blue-300 text-sm underline cursor-pointer"
            >
              Open Settings
            </button>
          ) : !recording.isRecording ? (
            <div className="text-center text-white/50 text-sm">
              Press your hotkey to start recording
            </div>
          ) : (
            <div className="text-center text-white/40 text-xs">
              Press Enter to submit • Escape to abort
            </div>
          )}
        </div>

        {/* Processing overlay */}
        {recording.isTranscribing && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/80">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className="text-sm text-white/70">Processing...</span>
            </div>
          </div>
        )}
        </div>
        
        {/* Hands-Free Controls */}
        <div className="w-96">
          <HandsFreeControls />
        </div>
      </div>
    </div>
  );
}