import { useState, useRef, useCallback } from "react";
import { recordAudio } from "@/lib/audio-utils";
import { logger } from "@/lib/logger";
import { APP_CONFIG } from "@/lib/constants";

export interface RecordingState {
  isRecording: boolean;
  isTranscribing: boolean;
  audioStream: MediaStream | null;
}

export interface UseRecordingOptions {
  onTranscriptionStart?: () => void;
  onTranscriptionComplete?: (text: string) => void;
  onError?: (error: string) => void;
}

export function useRecording(options: UseRecordingOptions = {}) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isTranscribing: false,
    audioStream: null,
  });

  const audioStreamRef = useRef<MediaStream | null>(null);
  const activeRecordingRef = useRef<Promise<Blob> | null>(null);

  const updateState = useCallback((updates: Partial<RecordingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const startRecording = useCallback(async () => {
    try {
      logger.info("Starting audio recording");
      
      // Small delay to ensure audio context is ready
      await new Promise(resolve => setTimeout(resolve, APP_CONFIG.RECORDING.DELAY_BEFORE_START));
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      updateState({ 
        isRecording: true, 
        audioStream: stream 
      });

      logger.info("Microphone stream acquired", { streamActive: true });

      // Another small delay for visualizer setup
      await new Promise(resolve => setTimeout(resolve, APP_CONFIG.RECORDING.DELAY_BEFORE_VISUALIZER));

      activeRecordingRef.current = recordAudio(stream);
      logger.info("Recording started successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to start recording";
      logger.error("Failed to start recording", { error: errorMessage });
      options.onError?.(errorMessage);
      cleanup();
    }
  }, [options, updateState]);

  const stopRecording = useCallback(async () => {
    if (!activeRecordingRef.current) return null;

    try {
      updateState({ isRecording: false, isTranscribing: true });
      options.onTranscriptionStart?.();

      recordAudio.stop();
      const recording = await activeRecordingRef.current;
      
      return recording;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to stop recording";
      options.onError?.(errorMessage);
      return null;
    } finally {
      cleanup();
    }
  }, [options, updateState]);

  const cleanup = useCallback(() => {
    logger.info("Cleaning up recording resources");
    recordAudio.stop();
    
    const streamToStop = audioStreamRef.current;
    if (streamToStop) {
      streamToStop.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    activeRecordingRef.current = null;
    updateState({
      isRecording: false,
      isTranscribing: false,
      audioStream: null,
    });
  }, [updateState]);

  const toggleRecording = useCallback(async () => {
    if (state.isRecording) {
      return await stopRecording();
    } else {
      await startRecording();
      return null;
    }
  }, [state.isRecording, startRecording, stopRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    toggleRecording,
    cleanup,
  };
}