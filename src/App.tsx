import { AudioVisualizer } from "@/components/ui/audio-visualizer";
import { useAudioRecording } from "@/hooks/use-audio-recording";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState, useRef } from "react";

function App() {
  const [status, setStatus] = useState<string>("Listening...");
  const [error, setError] = useState<string | null>(null);

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `vocal-recording-${timestamp}.webm`;

    try {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`Audio recording saved as: ${fileName}`);
    } catch (saveError) {
      console.error("Failed to save audio file:", saveError);
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioData = new Uint8Array(arrayBuffer);

    const groqApiKey = localStorage.getItem("groq_api_key") || "";
    const anthropicApiKey = localStorage.getItem("anthropic_api_key") || "";

    if (!groqApiKey || !anthropicApiKey) {
      throw new Error(
        "API keys not configured. Click the settings icon to set them."
      );
    }

    setStatus("Transcribing...");
    const transcribedText = await invoke<string>("transcribe_audio", {
      audioData: Array.from(audioData),
      apiKey: groqApiKey,
    });

    console.log(`Raw transcript (${fileName}):`, transcribedText);
    return transcribedText;
  };

  const onTranscriptionComplete = async (transcribedText: string) => {
    try {
      const anthropicApiKey = localStorage.getItem("anthropic_api_key") || "";

      setStatus("Refining prompt...");
      const systemPrompt = localStorage.getItem("system_prompt");
      const refinedPrompt = await invoke<string>("refine_prompt", {
        text: transcribedText,
        apiKey: anthropicApiKey,
        systemPrompt: systemPrompt,
      });

      console.log("Refined prompt:", refinedPrompt);

      await invoke("copy_to_clipboard", { text: refinedPrompt });

      setStatus("✓ Copied to clipboard!");

      setTimeout(async () => {
        await invoke("hide_dictation_window");
      }, 2000);
    } catch (error) {
      console.error("Error processing transcript:", error);
      setError(
        error instanceof Error ? error.message : "Error processing transcript"
      );
      setStatus("Error occurred");
    }
  };

  const audioRecorder = useAudioRecording({
    transcribeAudio,
    onTranscriptionComplete,
  });

  useEffect(() => {
    document.body.classList.add("dark", "main-window");
    return () => {
      document.body.classList.remove("dark", "main-window");
    };
  }, []);

  const toggleListeningRef = useRef(audioRecorder.toggleListening);

  useEffect(() => {
    toggleListeningRef.current = audioRecorder.toggleListening;
  });

  useEffect(() => {
    const unlistenPromise = listen("start-recording", () => {
      setStatus("Listening...");
      setError(null);
      if (
        !recordingStateRef.current.isRecording &&
        !recordingStateRef.current.isTranscribing
      ) {
        toggleListeningRef.current();
      }
    });

    return () => {
      unlistenPromise.then((fn) => fn());
    };
  }, []);

  const recordingStateRef = useRef({
    isRecording: false,
    isTranscribing: false,
  });
  const stopRecordingRef = useRef(audioRecorder.stopRecording);
  const cleanupRecordingRef = useRef(audioRecorder.cleanupRecording);

  useEffect(() => {
    recordingStateRef.current = {
      isRecording: audioRecorder.isRecording,
      isTranscribing: audioRecorder.isTranscribing,
    };
    stopRecordingRef.current = audioRecorder.stopRecording;
    cleanupRecordingRef.current = audioRecorder.cleanupRecording;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (
          recordingStateRef.current.isRecording ||
          recordingStateRef.current.isTranscribing
        ) {
          cleanupRecordingRef.current();
        }
        setStatus("Listening...");
        setError(null);
        invoke("hide_dictation_window");
      } else if (event.key === "Enter" || event.key === "Return") {
        if (
          recordingStateRef.current.isRecording &&
          !recordingStateRef.current.isTranscribing
        ) {
          stopRecordingRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    audioRecorder.isRecording,
    audioRecorder.isTranscribing,
    audioRecorder.stopRecording,
    audioRecorder.cleanupRecording,
  ]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="relative w-96 rounded-2xl border border-white/10 bg-black p-6 shadow-2xl">
        <div className="mb-4 text-center">
          <p className="text-sm text-white/70">{status}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="mb-6 h-32">
          <AudioVisualizer
            stream={audioRecorder.audioStream}
            isRecording={audioRecorder.isRecording}
          />
        </div>

        <div className="flex flex-col items-center space-y-3">
          {!audioRecorder.isRecording ? (
            <div className="text-center text-white/50 text-sm">
              Press your hotkey to start recording
            </div>
          ) : (
            <div className="text-center text-white/40 text-xs">
              Press Enter to submit • Escape to abort
            </div>
          )}
        </div>

        {audioRecorder.isTranscribing && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/80">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className="text-sm text-white/70">Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
