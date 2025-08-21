export class AppError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, code: string = "UNKNOWN_ERROR", isOperational: boolean = true) {
    super(message);
    this.code = code;
    this.isOperational = isOperational;
    this.name = "AppError";

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ApiError extends AppError {
  constructor(message: string, code: string = "API_ERROR") {
    super(message, code);
    this.name = "ApiError";
  }
}

export class ConfigError extends AppError {
  constructor(message: string, code: string = "CONFIG_ERROR") {
    super(message, code);
    this.name = "ConfigError";
  }
}

export class RecordingError extends AppError {
  constructor(message: string, code: string = "RECORDING_ERROR") {
    super(message, code);
    this.name = "RecordingError";
  }
}

export function handleError(error: unknown): { message: string; code: string } {
  console.error("Error occurred:", error);

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes("Permission denied")) {
      return {
        message: "Microphone permission denied. Please enable microphone access in your browser settings.",
        code: "PERMISSION_DENIED",
      };
    }

    if (error.message.includes("API key")) {
      return {
        message: "API keys not configured. Please set up your API keys in Settings.",
        code: "MISSING_API_KEYS",
      };
    }

    if (error.message.includes("network") || error.message.includes("fetch")) {
      return {
        message: "Network error. Please check your internet connection and try again.",
        code: "NETWORK_ERROR",
      };
    }

    return {
      message: error.message,
      code: "UNKNOWN_ERROR",
    };
  }

  return {
    message: "An unexpected error occurred. Please try again.",
    code: "UNKNOWN_ERROR",
  };
}

export function createErrorMessage(error: unknown): string {
  const { message } = handleError(error);
  return message;
}