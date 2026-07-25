type LogContext = unknown[];

// Central seam for future approved telemetry. Client logs intentionally remain silent so
// authentication, location, and merchant metadata never leak through browser consoles.
const discard = (_tag: string, _message: string, ..._context: LogContext): void => undefined;

export const logger = {
  log: discard,
  info: discard,
  warn: discard,
  error: discard,
};
