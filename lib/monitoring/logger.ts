type LogLevel = "debug" | "info" | "warn" | "error";

interface LogRecord {
  details?: Record<string, unknown>;
  level: LogLevel;
  message: string;
  namespace: string;
  timestamp: string;
}

interface Logger {
  debug: (message: string, details?: Record<string, unknown>) => void;
  error: (message: string, details?: Record<string, unknown>) => void;
  info: (message: string, details?: Record<string, unknown>) => void;
  warn: (message: string, details?: Record<string, unknown>) => void;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function isLogLevel(value: string): value is LogLevel {
  return value === "debug" || value === "info" || value === "warn" || value === "error";
}

function getConfiguredLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL ?? process.env.NEXT_PUBLIC_LOG_LEVEL;
  const normalizedLevel = envLevel?.toLowerCase();
  if (normalizedLevel && isLogLevel(normalizedLevel)) {
    return normalizedLevel;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel, configuredLevel: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLevel];
}

function writeLog(level: LogLevel, record: LogRecord): void {
  const payload = JSON.stringify(record);

  if (level === "debug") {
    console.debug(payload);
    return;
  }

  if (level === "info") {
    console.info(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.error(payload);
}

export function createLogger(namespace: string): Logger {
  const configuredLevel = getConfiguredLevel();

  function log(level: LogLevel, message: string, details?: Record<string, unknown>): void {
    if (!shouldLog(level, configuredLevel)) {
      return;
    }

    writeLog(level, {
      level,
      message,
      namespace,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    debug: (message: string, details?: Record<string, unknown>): void => {
      log("debug", message, details);
    },
    info: (message: string, details?: Record<string, unknown>): void => {
      log("info", message, details);
    },
    warn: (message: string, details?: Record<string, unknown>): void => {
      log("warn", message, details);
    },
    error: (message: string, details?: Record<string, unknown>): void => {
      log("error", message, details);
    },
  };
}
