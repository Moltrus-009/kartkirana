import { RecaptchaVerifier, type Auth } from 'firebase/auth';
import { logger } from '../core/logger/logger';

class RecaptchaManager {
  private verifier: RecaptchaVerifier | null = null;
  private containerId: string | null = null;

  setup(auth: Auth, containerId: string): RecaptchaVerifier | null {
    try {
      this.clear(); // Clear any previous instances before creating a new one

      logger.info('reCAPTCHA', `Initializing RecaptchaVerifier on container: ${containerId}`);
      this.containerId = containerId;

      // Clean the container element's HTML content to prevent duplicate widget rendering
      const containerEl = document.getElementById(containerId);
      if (containerEl) {
        containerEl.innerHTML = '';
      }

      // Create a ReCAPTCHA verifier
      const verifier = new RecaptchaVerifier(auth, containerId, {
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
        logger.info('reCAPTCHA', 'Clearing previous reCAPTCHA verifier instance.');
        this.verifier.clear();
      } catch (err) {
        logger.warn('reCAPTCHA', 'Failed to clear previous verifier instance:', err);
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
  }
}

export const recaptchaManager = new RecaptchaManager();
