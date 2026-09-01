import { RecaptchaVerifier, type Auth } from 'firebase/auth';
import { logger } from './logger';

class RecaptchaManager {
  private verifier: RecaptchaVerifier | null = null;
  private widgetId: number | null = null;
  private containerId: string | null = null;
  private auth: Auth | null = null;
  private generation = 0;

  setup(auth: Auth, containerId: string): RecaptchaVerifier | null {
    try {
      if (this.verifier && this.auth === auth && this.containerId === containerId) {
        return this.verifier;
      }

      this.clear();

      logger.info('reCAPTCHA', `Initializing RecaptchaVerifier on container: ${containerId}`);
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
          void this.reset();
        }
      });

      this.verifier = verifier;
      void verifier.render()
        .then((widgetId) => { this.widgetId = widgetId; })
        .catch((err) => logger.warn('reCAPTCHA', 'Background verifier preparation failed:', err));
      return verifier;
    } catch (err) {
      logger.error('reCAPTCHA', 'Failed to initialize RecaptchaVerifier:', err);
      return null;
    }
  }

  getVerifier(): RecaptchaVerifier | null {
    return this.verifier;
  }

  async reset(): Promise<void> {
    if (!this.verifier) return;
    try {
      const widgetId = this.widgetId ?? await this.verifier.render();
      this.widgetId = widgetId;
      const grecaptcha = (window as Window & { grecaptcha?: { reset: (id?: number) => void } }).grecaptcha;
      if (grecaptcha) grecaptcha.reset(widgetId);
    } catch (err) {
      logger.warn('reCAPTCHA', 'Unable to reset the existing verifier; recreating it on the next request.', err);
      this.clear();
    }
  }

  clear() {
    if (this.verifier) {
      try {
        logger.info('reCAPTCHA', 'Clearing previous reCAPTCHA verifier instance.');
        this.verifier.clear();
      } catch (err) {
        logger.warn('reCAPTCHA', 'Failed to clear previous verifier instance:', err);
      }
      this.verifier = null;
      this.widgetId = null;
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
