const DispatchService = require('../services/dispatchService');

const PROCESS_INTERVAL_MS = 3000; // Scan for rider assignments and timeouts every 3 seconds for faster customer wait times

async function startDispatchWorker() {
  console.log('[DISPATCH WORKER] Targeted dispatch manager initialized.');
  
  // Initial scan delay
  setTimeout(() => {
    runWorkerLoop();
  }, 2000);
}

async function runDispatchWorkerOnce() {
  await DispatchService.runCycle();
}

async function runWorkerLoop() {
  try {
    await runDispatchWorkerOnce();
  } catch (error) {
    console.error('[DISPATCH WORKER LOOP ERROR]', error);
  } finally {
    // Queue next execution
    setTimeout(runWorkerLoop, PROCESS_INTERVAL_MS);
  }
}

module.exports = {
  startDispatchWorker,
  runDispatchWorkerOnce
};
