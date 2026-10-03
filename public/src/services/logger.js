/**
 * Lightweight structured logger for API processes.
 * Levels: debug | info | warn | error
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] || LEVELS.info;

function emit(level, message, meta) {
  if ((LEVELS[level] || 99) < minLevel) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    service: 'geleza-sa-api',
    ...(meta && typeof meta === 'object' ? meta : meta != null ? { detail: meta } : {})
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  debug: (msg, meta) => emit('debug', msg, meta),
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta)
};
