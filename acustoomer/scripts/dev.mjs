import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const customerDirectory = path.resolve(appDirectory, '..');
const backendDirectory = path.resolve(customerDirectory, '..', 'server');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];

const isPortOpen = (port) => new Promise((resolve) => {
  const socket = net.connect({ host: '127.0.0.1', port });
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => resolve(false));
});

const start = (command, args, cwd) => {
  console.log("----- START -----");
  console.log("command:", command);
  console.log("args:", args);
  console.log("cwd:", cwd);

  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
  });

  child.on("error", (err) => {
    console.error("Spawn error:", err);
  });

  children.push(child);
  return child;
};

if (!(await isPortOpen(5000))) {
  console.log('[dev] Starting Kart Kirana payment API on port 5000…');
  start(npmCommand, ['start'], backendDirectory);
} else {
  console.log('[dev] Payment API is already running on port 5000.');
}

const client = start(npmCommand, ['run', 'dev:client'], customerDirectory);

const shutdown = () => {
  for (const child of children) child.kill();
  process.exit();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
client.once('exit', (code) => process.exit(code ?? 0));
