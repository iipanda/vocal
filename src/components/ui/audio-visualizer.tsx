import { useEffect, useRef } from "react";

const AUDIO_CONFIG = {
  FFT_SIZE: 2048,
  SMOOTHING: 0.8,
  MIN_BAR_HEIGHT: 2,
  MIN_BAR_WIDTH: 2,
  BAR_SPACING: 1,
  // Focus on human voice frequency range (80Hz - 8kHz)
  MIN_FREQUENCY: 80,
  MAX_FREQUENCY: 8000,
  COLOR: {
    MIN_INTENSITY: 100,
    MAX_INTENSITY: 255,
    INTENSITY_RANGE: 155,
  },
} as const;

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

export function AudioVisualizer({
  stream,
  isRecording,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  useEffect(() => {
    if (stream && isRecording) {
      startVisualization();
    } else {
      cleanup();
    }
  }, [stream, isRecording]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;

        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const startVisualization = async () => {
    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = AUDIO_CONFIG.FFT_SIZE;
      analyser.smoothingTimeConstant = AUDIO_CONFIG.SMOOTHING;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream!);
      source.connect(analyser);

      draw();
    } catch (error) {
      console.error("Error starting visualization:", error);
    }
  };

  const getBarColor = (normalizedHeight: number) => {
    const intensity =
      Math.floor(normalizedHeight * AUDIO_CONFIG.COLOR.INTENSITY_RANGE) +
      AUDIO_CONFIG.COLOR.MIN_INTENSITY;
    return `rgb(${intensity}, ${intensity}, ${intensity})`;
  };

  const drawBar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    centerY: number,
    width: number,
    height: number,
    color: string
  ) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, centerY - height, width, height);
    ctx.fillRect(x, centerY, width, height);
  };

  const draw = () => {
    if (!isRecording) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);

    const drawFrame = () => {
      animationFrameRef.current = requestAnimationFrame(drawFrame);

      analyser.getByteFrequencyData(frequencyData);

      ctx.clearRect(
        0,
        0,
        canvas.width / (window.devicePixelRatio || 1),
        canvas.height / (window.devicePixelRatio || 1)
      );

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const dpr = window.devicePixelRatio || 1;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cssWidth = canvasWidth / dpr;
      const cssHeight = canvasHeight / dpr;

      const availableWidth = cssWidth - AUDIO_CONFIG.BAR_SPACING * 2;
      const numBars = Math.floor(
        availableWidth / (AUDIO_CONFIG.MIN_BAR_WIDTH + AUDIO_CONFIG.BAR_SPACING)
      );
      const barWidth = Math.max(
        AUDIO_CONFIG.MIN_BAR_WIDTH,
        (availableWidth - (numBars - 1) * AUDIO_CONFIG.BAR_SPACING) / numBars
      );

      const startX = AUDIO_CONFIG.BAR_SPACING;
      const centerY = cssHeight / 2;

      // Calculate frequency resolution
      const sampleRate = audioContextRef.current?.sampleRate || 44100;
      const frequencyResolution = sampleRate / AUDIO_CONFIG.FFT_SIZE;
      
      // Convert frequency range to bin indices for potential future use
      // const minBin = Math.floor(AUDIO_CONFIG.MIN_FREQUENCY / frequencyResolution);
      // const maxBin = Math.floor(AUDIO_CONFIG.MAX_FREQUENCY / frequencyResolution);
      
      // Create logarithmic frequency bands for more natural voice representation
      const logMin = Math.log(AUDIO_CONFIG.MIN_FREQUENCY);
      const logMax = Math.log(AUDIO_CONFIG.MAX_FREQUENCY);
      const logStep = (logMax - logMin) / numBars;

      for (let i = 0; i < numBars; i++) {
        // Calculate logarithmic frequency range for this bar
        const freqStart = Math.exp(logMin + i * logStep);
        const freqEnd = Math.exp(logMin + (i + 1) * logStep);
        
        // Convert to bin indices
        const binStart = Math.floor(freqStart / frequencyResolution);
        const binEnd = Math.ceil(freqEnd / frequencyResolution);
        
        // Ensure we have at least some bins to analyze
        const actualBinEnd = Math.max(binStart + 1, binEnd);
        
        // Calculate weighted average instead of max for smoother visualization
        let totalAmplitude = 0;
        let weightSum = 0;
        for (let bin = binStart; bin < actualBinEnd && bin < bufferLength; bin++) {
          const weight = 1; // Equal weighting for simplicity
          totalAmplitude += frequencyData[bin] * weight;
          weightSum += weight;
        }
        
        const averageAmplitude = weightSum > 0 ? totalAmplitude / weightSum : 0;
        const normalizedHeight = averageAmplitude / 255;
        // Scale to actual canvas height - use 80% of half height for proper scaling
        const maxBarHeight = (cssHeight / 2) * 0.8;
        const barHeight = Math.max(
          AUDIO_CONFIG.MIN_BAR_HEIGHT,
          normalizedHeight * maxBarHeight
        );

        const x = startX + i * (barWidth + AUDIO_CONFIG.BAR_SPACING);

        drawBar(
          ctx,
          x,
          centerY,
          barWidth,
          barHeight,
          getBarColor(normalizedHeight)
        );
      }
    };

    drawFrame();
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg bg-black flex items-center justify-center relative overflow-hidden"
    >
      <canvas ref={canvasRef} className="h-full w-full rounded-lg" />
      {/* Edge fade out masks */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Left edge fade */}
        <div className="absolute left-0 top-0 h-full w-5 bg-gradient-to-r from-black to-transparent"></div>
        {/* Right edge fade */}
        <div className="absolute right-0 top-0 h-full w-5 bg-gradient-to-l from-black to-transparent"></div>
      </div>
    </div>
  );
}
