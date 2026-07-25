import { logger } from './logger';

type NetworkCallback = (isOnline: boolean) => void;
type QueuedOperation = () => Promise<any> | any;

class NetworkManager {
  private isOnline = navigator.onLine;
  private listeners = new Set<NetworkCallback>();
  private offlineQueue: QueuedOperation[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.isOnline = true;
    logger.info('Network', 'Connection recovered. Processing queued operations...');
    this.notify();
    this.drainQueue();
  };

  private handleOffline = () => {
    this.isOnline = false;
    logger.warn('Network', 'Connection lost. Operations will be queued.');
    this.notify();
  };

  private notify() {
    this.listeners.forEach((callback) => {
      try {
        callback(this.isOnline);
      } catch (err) {
        logger.error('Network', 'Error executing network listener callback', err);
      }
    });
  }

  private async drainQueue() {
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const op of queue) {
      try {
        await op();
      } catch (err) {
        logger.error('Network', 'Failed to execute queued offline operation on reconnect:', err);
      }
    }
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  subscribe(callback: NetworkCallback): () => void {
    this.listeners.add(callback);
    callback(this.isOnline);
    return () => {
      this.listeners.delete(callback);
    };
  }

  runWhenOnline(op: QueuedOperation): Promise<any> {
    if (this.isOnline) {
      try {
        return Promise.resolve(op());
      } catch (err) {
        return Promise.reject(err);
      }
    } else {
      logger.info('Network', 'Queueing operation to run upon reconnection.');
      return new Promise((resolve, reject) => {
        this.offlineQueue.push(async () => {
          try {
            const res = await op();
            resolve(res);
          } catch (err) {
            reject(err);
          }
        });
      });
    }
  }
}

export const networkManager = new NetworkManager();
