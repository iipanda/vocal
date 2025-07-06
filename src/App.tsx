import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { AudioVisualizer } from "@/components/ui/audio-visualizer";
import { Button } from "@/components/ui/button";
import { Settings } from "./Settings";
import { Settings as SettingsIcon, Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioRecorder {
  start: () => Promise<MediaStream | null>;
  stop: () => Promise<Blob>;
  isRecording: boolean;
  stream: MediaStream | null;
  cleanup: () => void;
}

function useAudioRecorder(): AudioRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async (): Promise<MediaStream | null> => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStream(mediaStream);
      return mediaStream;
    } catch (error) {
      console.error("Error starting recording:", error);
      return null;
    }
  };

  const stop = (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/wav" });
          resolve(blob);
          setIsRecording(false);
          
          // Clean up stream
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
          }
        };
        mediaRecorderRef.current.stop();
      }
    });
  };

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  return { start, stop, isRecording, stream, cleanup };
}

function App() {
  const [status, setStatus] = useState<string>("Listening...");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRecorder = useAudioRecorder();

  // Add dark class to body on mount
  useEffect(() => {
    document.body.classList.add('dark');
    return () => document.body.classList.remove('dark');
  }, []);

  // Listen for start recording event from backend
  useEffect(() => {
    const unlisten = listen("start-recording", () => {
      handleStartRecording();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  // Listen for window hide events to stop recording
  useEffect(() => {
    const unlisten = listen("tauri://blur", () => {
      if (audioRecorder.isRecording) {
        audioRecorder.cleanup();
        setStatus("Listening...");
        setIsProcessing(false);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [audioRecorder.isRecording]);

  // Cleanup microphone when component unmounts
  useEffect(() => {
    return () => {
      if (audioRecorder.isRecording) {
        audioRecorder.cleanup();
      }
    };
  }, []);

  const handleStartRecording = async () => {
    setError(null);
    setStatus("Listening...");
    await audioRecorder.start();
  };

  const handleStopRecording = async () => {
    if (!audioRecorder.isRecording) return;
    
    setStatus("Processing...");
    setIsProcessing(true);
    
    try {
      const audioBlob = await audioRecorder.stop();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);
      
      // Get API keys
      const groqApiKey = localStorage.getItem('groq_api_key') || '';
      const anthropicApiKey = localStorage.getItem('anthropic_api_key') || '';
      
      if (!groqApiKey || !anthropicApiKey) {
        setError("API keys not configured. Click the settings icon to set them.");
        setStatus("Configuration needed");
        setIsProcessing(false);
        return;
      }
      
      // Transcribe audio
      setStatus("Transcribing...");
      const transcribedText = await invoke<string>("transcribe_audio", {
        audioData: Array.from(audioData),
        apiKey: groqApiKey
      });
      
      // Refine prompt
      setStatus("Refining prompt...");
      const refinedPrompt = await invoke<string>("refine_prompt", {
        text: transcribedText,
        apiKey: anthropicApiKey
      });
      
      // Copy to clipboard
      await invoke("copy_to_clipboard", { text: refinedPrompt });
      
      setStatus("✓ Copied to clipboard!");
      
      // Hide window after 2 seconds
      setTimeout(async () => {
        await invoke("hide_dictation_window");
      }, 2000);
      
    } catch (error) {
      console.error("Error processing audio:", error);
      setError(error instanceof Error ? error.message : "Error processing audio");
      setStatus("Error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (audioRecorder.isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="relative w-96 rounded-2xl border border-white/10 bg-black p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1 text-center">
            <p className="text-sm text-white/70">{status}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="h-8 w-8"
          >
            <SettingsIcon className="h-4 w-4 text-white/70" />
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Audio Visualizer */}
        <div className="mb-6 h-32">
          <AudioVisualizer
            stream={audioRecorder.stream}
            isRecording={audioRecorder.isRecording}
            onClick={toggleRecording}
          />
        </div>

        {/* Controls */}
        <div className="flex justify-center">
          <Button
            onClick={toggleRecording}
            disabled={isProcessing}
            size="lg"
            className={cn(
              "h-12 w-12 rounded-full transition-all",
              audioRecorder.isRecording
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-primary hover:bg-primary/90"
            )}
          >
            {audioRecorder.isRecording ? (
              <Square className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/80">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className="text-sm text-white/70">Processing...</span>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        <Settings 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)} 
        />
      </div>
    </div>
  );
}

export default App;