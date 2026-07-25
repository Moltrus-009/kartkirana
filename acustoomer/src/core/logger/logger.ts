const IS_DEV = import.meta.env.DEV;

export const logger = {
  log(message: string, ...args: any[]): void {
    if (IS_DEV) {
      console.log(`[LOG] ${message}`, ...args);
    }
  },
  info(message: string, ...args: any[]): void {
    if (IS_DEV) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error(message: string, error?: any, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, error, ...args);
  }
};
