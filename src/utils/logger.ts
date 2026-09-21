export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  meta?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private format(level: LogLevel, message: string, meta?: Record<string, unknown>, err?: unknown): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (meta && Object.keys(meta).length > 0) {
      if (typeof meta.requestId === 'string') {
        entry.requestId = meta.requestId;
        const { requestId: _, ...rest } = meta;
        if (Object.keys(rest).length > 0) entry.meta = rest;
      } else {
        entry.meta = meta;
      }
    }

    if (err instanceof Error) {
      entry.error = {
        name: err.name,
        message: err.message,
        stack: this.isDevelopment ? err.stack : undefined,
      };
    }

    return entry;
  }

  private print(entry: LogEntry): void {
    if (this.isDevelopment) {
      const colors: Record<LogLevel, string> = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m', // Red
      };
      const reset = '\x1b[0m';
      const color = colors[entry.level] || '';
      const reqTag = entry.requestId ? ` [${entry.requestId.substring(0, 8)}]` : '';
      const metaStr = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';
      const errStr = entry.error?.stack ? `\n${entry.error.stack}` : entry.error ? ` (${entry.error.message})` : '';

      console.log(
        `${color}[${entry.timestamp}] [${entry.level.toUpperCase()}]${reqTag}${reset} ${entry.message}${metaStr}${errStr}`
      );
    } else {
      console.log(JSON.stringify(entry));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.print(this.format('info', message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.print(this.format('warn', message, meta));
  }

  error(message: string, err?: unknown, meta?: Record<string, unknown>): void {
    this.print(this.format('error', message, meta, err));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      this.print(this.format('debug', message, meta));
    }
  }
}

export const logger = new Logger();
