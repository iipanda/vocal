import { useEffect, useRef } from "react";

const AUDIO_CONFIG = {
  FFT_SIZE: 512,
  SMOOTHING: 0.8,
  MIN_BAR_HEIGHT: 2,
  MIN_BAR_WIDTH: 2,
  BAR_SPACING: 1,
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

      const step = Math.floor(bufferLength / numBars);

      for (let i = 0; i < numBars; i++) {
        const dataIndex = i * step;
        const normalizedHeight = frequencyData[dataIndex] / 255;
        const barHeight = Math.max(
          AUDIO_CONFIG.MIN_BAR_HEIGHT,
          normalizedHeight * centerY * 0.9
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
      className="h-full w-full rounded-lg bg-black flex items-center justify-center"
    >
      <canvas ref={canvasRef} className="h-full w-full rounded-lg" />
    </div>
  );
}
