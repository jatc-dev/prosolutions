export const logger = {
  info: (message: string, meta?: unknown) => {
    console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...(meta ?? {}) }));
  },
  warn: (message: string, meta?: unknown) => {
    console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...(meta ?? {}) }));
  },
  error: (message: string, meta?: unknown) => {
    console.error(JSON.stringify({ level: 'error', message, timestamp: new Date().toISOString(), ...(meta ?? {}) }));
  },
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(JSON.stringify({ level: 'debug', message, timestamp: new Date().toISOString(), ...(meta ?? {}) }));
    }
  },
};
