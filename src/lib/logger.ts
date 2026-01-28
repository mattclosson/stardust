// Centralized logging utility
// Logs are only output in development mode

const isDev = import.meta.env.DEV

type LogLevel = "log" | "error" | "warn" | "info" | "debug"

function createLogger(level: LogLevel) {
  return (message: string, ...args: unknown[]) => {
    if (isDev) {
      console[level](`[${level.toUpperCase()}]`, message, ...args)
    }
  }
}

export const logger = {
  log: createLogger("log"),
  error: createLogger("error"),
  warn: createLogger("warn"),
  info: createLogger("info"),
  debug: createLogger("debug"),
}

// For production error tracking, you might want to send to a service
export function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  if (isDev) {
    console.error(`[ERROR] ${message}:`, errorMessage, context ?? "")
  }
  
  // TODO: In production, send to error tracking service (e.g., Sentry)
  // if (!isDev) {
  //   captureException(error, { extra: { message, ...context } })
  // }
}
