import { RecaptchaVerifier, type Auth } from 'firebase/auth';
import { logger } from '../core/logger/logger';

class RecaptchaManager {
  private verifier: RecaptchaVerifier | null = null;
  private containerId: string | null = null;
  private auth: Auth | null = null;
  private generation = 0;

  setup(auth: Auth, containerId: string): RecaptchaVerifier | null {
    try {
      if (this.verifier && this.auth === auth && this.containerId === containerId) {
        return this.verifier;
      }

      this.clear();

      logger.info('reCAPTCHA', `Creating and initializing RecaptchaVerifier on container: ${containerId}`);
      this.containerId = containerId;
      this.auth = auth;

      const containerEl = document.getElementById(containerId);
      if (!containerEl) throw new Error(`reCAPTCHA container "${containerId}" was not found.`);
      const widgetHost = document.createElement('div');
      widgetHost.id = `${containerId}-widget-${++this.generation}`;
      containerEl.replaceChildren(widgetHost);

      const verifier = new RecaptchaVerifier(auth, widgetHost, {
        size: 'invisible',
        callback: () => {
          logger.info('reCAPTCHA', 'reCAPTCHA challenge successfully solved.');
        },
        'expired-callback': () => {
          logger.warn('reCAPTCHA', 'reCAPTCHA verification response expired.');
        }
      });

      this.verifier = verifier;
      return verifier;
    } catch (err) {
      logger.error('reCAPTCHA', 'Failed to initialize RecaptchaVerifier:', err);
      return null;
    }
  }

  getVerifier(): RecaptchaVerifier | null {
    return this.verifier;
  }

  clear() {
    if (this.verifier) {
      try {
        logger.info('reCAPTCHA', 'Clearing reCAPTCHA verifier instance.');
        this.verifier.clear();
      } catch (err) {
        logger.warn('reCAPTCHA', 'Failed to clear verifier instance:', err);
      }
      this.verifier = null;
    }
    
    if (this.containerId) {
      const containerEl = document.getElementById(this.containerId);
      if (containerEl) {
        containerEl.innerHTML = '';
      }
      this.containerId = null;
    }
    this.auth = null;
  }
}

export const recaptchaManager = new RecaptchaManager();
