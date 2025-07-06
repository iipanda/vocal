import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Settings } from "./Settings";
import "./App.css";

interface AudioRecorder {
  start: () => void;
  stop: () => Promise<Blob>;
  isRecording: boolean;
}

function useAudioRecorder(): AudioRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stop = (): Promise<Blob> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: "audio/wav" });
          resolve(blob);
          setIsRecording(false);
        };
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    });
  };

  return { start, stop, isRecording };
}

function WaveformVisualizer({ isRecording }: { isRecording: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      startVisualization();
    } else {
      stopVisualization();
    }

    return () => {
      stopVisualization();
    };
  }, [isRecording]);

  const startVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      draw();
    } catch (error) {
      console.error("Error starting visualization:", error);
    }
  };

  const stopVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const draw = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    ctx.fillStyle = "#4A90E2";
    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height;
      
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }

    animationRef.current = requestAnimationFrame(draw);
  };

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={100}
      className="waveform-canvas"
    />
  );
}

function App() {
  const [status, setStatus] = useState<string>("Press Cmd+Shift+V to start dictation");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRecorder = useAudioRecorder();

  const handleStartRecording = async () => {
    setError(null);
    setStatus("Listening... Click to stop");
    audioRecorder.start();
  };

  const handleStopRecording = async () => {
    if (!audioRecorder.isRecording) return;
    
    setStatus("Processing...");
    setIsProcessing(true);
    
    try {
      const audioBlob = await audioRecorder.stop();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);
      
      // Get API keys (in production, these should be stored securely)
      const groqApiKey = localStorage.getItem('groq_api_key') || '';
      const anthropicApiKey = localStorage.getItem('anthropic_api_key') || '';
      
      if (!groqApiKey || !anthropicApiKey) {
        setError("API keys not configured. Click the gear icon to set them.");
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

  const handleCanvasClick = () => {
    if (audioRecorder.isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  return (
    <div className="dictation-container">
      <div className="dictation-window">
        <div className="window-header">
          <div className="status-text">{status}</div>
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        <div 
          className="visualizer-container"
          onClick={handleCanvasClick}
          style={{ cursor: audioRecorder.isRecording ? 'pointer' : 'default' }}
        >
          <WaveformVisualizer isRecording={audioRecorder.isRecording} />
        </div>
        
        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner"></div>
          </div>
        )}
        
        <Settings 
          isOpen={showSettings} 
          onClose={() => setShowSettings(false)} 
        />
      </div>
    </div>
  );
}

export default App;