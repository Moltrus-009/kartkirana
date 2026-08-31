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
    if (IS_DEV) {
      console.warn(`[WARN] ${message}`, ...args);
    } else {
      const context = args.find(value => typeof value === 'string');
      console.warn(`[WARN] ${message}${context ? `: ${context}` : ''}`);
    }
  },
  error(message: string, error?: any, ...args: any[]): void {
    if (IS_DEV) {
      console.error(`[ERROR] ${message}`, error, ...args);
    } else {
      const context = typeof error === 'string'
        ? error
        : args.find(value => typeof value === 'string');
      console.error(`[ERROR] ${message}${context ? `: ${context}` : ''}`);
    }
  }
};
