export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private addLog(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
    };

    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console for development
    const consoleMessage = `[${entry.timestamp.toISOString()}] ${level}: ${message}`;
    
    switch (level) {
      case "DEBUG":
        console.debug(consoleMessage, data);
        break;
      case "INFO":
        console.info(consoleMessage, data);
        break;
      case "WARN":
        console.warn(consoleMessage, data);
        break;
      case "ERROR":
        console.error(consoleMessage, data);
        break;
    }
  }

  debug(message: string, data?: any) {
    this.addLog("DEBUG", message, data);
  }

  info(message: string, data?: any) {
    this.addLog("INFO", message, data);
  }

  warn(message: string, data?: any) {
    this.addLog("WARN", message, data);
  }

  error(message: string, data?: any) {
    this.addLog("ERROR", message, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) return [...this.logs];
    return this.logs.filter(log => log.level === level);
  }

  clearLogs() {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();

// Legacy compatibility function
export async function log(level: LogLevel, message: string, data?: any): Promise<void> {
  logger.addLog(level, message, data);
}