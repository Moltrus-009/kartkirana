type LogCategory = 'Auth' | 'OTP' | 'Firestore' | 'Storage' | 'Location' | 'Network' | 'reCAPTCHA' | 'Push';

class Logger {
  private isProd = import.meta.env.PROD;

  private formatMessage(category: LogCategory, msg: string): string {
    return `[${category}] ${msg}`;
  }

  debug(category: LogCategory, msg: string, ...args: any[]) {
    if (!this.isProd) {
      console.log(this.formatMessage(category, msg), ...args);
    }
  }

  info(category: LogCategory, msg: string, ...args: any[]) {
    if (!this.isProd) {
      console.info(this.formatMessage(category, msg), ...args);
    }
  }

  warn(category: LogCategory, msg: string, ...args: any[]) {
    console.warn(this.formatMessage(category, msg), ...args);
  }

  error(category: LogCategory, msg: string, ...args: any[]) {
    console.error(this.formatMessage(category, msg), ...args);
  }
}

export const logger = new Logger();
