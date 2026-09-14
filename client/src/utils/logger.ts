export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    console.debug(`[DEBUG] ${message}`, ...args);
  },
  child: () => logger,
  infoWithValues: (..._args: unknown[]) => {},
  debugWithValues: (..._args: unknown[]) => {},
  warnWithValues: (..._args: unknown[]) => {},
  errorWithValues: (..._args: unknown[]) => {},
};
