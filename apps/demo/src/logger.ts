type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

const colors = {
  INFO: '\x1b[36m',    // cyan
  WARN: '\x1b[33m',    // yellow
  ERROR: '\x1b[31m',   // red
  DEBUG: '\x1b[90m',   // gray
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
};

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

function log(level: LogLevel, module: string, message: string, data?: Record<string, unknown>): void {
  const color = colors[level];
  const prefix = `${colors.BOLD}${color}[${timestamp()}]${colors.RESET} ${color}${level.padEnd(5)}${colors.RESET} ${colors.BOLD}[${module}]${colors.RESET}`;
  
  if (data && Object.keys(data).length > 0) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export const logger = {
  info: (module: string, message: string, data?: Record<string, unknown>) => log('INFO', module, message, data),
  warn: (module: string, message: string, data?: Record<string, unknown>) => log('WARN', module, message, data),
  error: (module: string, message: string, data?: Record<string, unknown>) => log('ERROR', module, message, data),
  debug: (module: string, message: string, data?: Record<string, unknown>) => log('DEBUG', module, message, data),
};
