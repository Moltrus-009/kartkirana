let running = false;
async function runRoutineWorkerOnce() {
    if (process.env.ROUTINE_ORDERS_ENABLED !== 'true' || running)
        return;
    running = true;
    try {
        await require('../services/routineRuntime').sweep();
    }
    finally {
        running = false;
    }
}
function startRoutineWorker() {
    if (process.env.ROUTINE_ORDERS_ENABLED !== 'true')
        return;
    const run = () => runRoutineWorkerOnce().catch(error => console.error('[ROUTINE] Worker failed', { code: error.code || 'DEPENDENCY_UNAVAILABLE' }));
    run();
    setInterval(run, require('../config/planning').workerMinutes * 60000);
}
module.exports = { runRoutineWorkerOnce, startRoutineWorker };
