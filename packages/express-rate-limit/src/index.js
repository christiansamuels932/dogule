import { setTimeout as scheduleTimeout } from 'node:timers/promises';

const defaultKeyGenerator = (request) => request.ip ?? 'global';

const setHeaders = (response, options, entry) => {
  const now = Date.now();
  const remaining = Math.max(0, options.max - entry.count);
  const resetSeconds = Math.max(0, Math.ceil((entry.expiresAt - now) / 1000));

  if (options.standardHeaders) {
    response.setHeader('RateLimit-Limit', String(options.max));
    response.setHeader('RateLimit-Remaining', String(remaining));
    response.setHeader('RateLimit-Reset', String(resetSeconds));
  }

  if (options.legacyHeaders ?? true) {
    response.setHeader('X-RateLimit-Limit', String(options.max));
    response.setHeader('X-RateLimit-Remaining', String(remaining));
    response.setHeader('X-RateLimit-Reset', String(Math.floor(entry.expiresAt / 1000)));
  } else {
    response.removeHeader('X-RateLimit-Limit');
    response.removeHeader('X-RateLimit-Remaining');
    response.removeHeader('X-RateLimit-Reset');
  }
};

const scheduleCleanup = (hits, key, delay) => {
  scheduleTimeout(delay).then(() => hits.delete(key)).catch(() => undefined);
};

const createHandler = (options) => {
  const windowMs = Math.max(1, options.windowMs);
  const max = Math.max(1, options.max);
  const handler = options.handler ?? ((_, response) => response.status(429).end());
  const keyGenerator = options.keyGenerator ?? defaultKeyGenerator;
  const hits = new Map();

  return (request, response, next) => {
    const key = keyGenerator(request, response);
    const now = Date.now();
    const existing = hits.get(key);

    if (!existing || existing.expiresAt <= now) {
      const entry = { count: 1, expiresAt: now + windowMs };
      hits.set(key, entry);
      setHeaders(response, options, entry);
      scheduleCleanup(hits, key, windowMs);
      next();
      return;
    }

    existing.count += 1;
    setHeaders(response, options, existing);

    if (existing.count > max) {
      handler(request, response, next, {
        windowMs,
        max,
        currentHits: existing.count,
        resetTime: new Date(existing.expiresAt),
      });
      return;
    }

    next();
  };
};

const rateLimit = (options) => {
  if (!options || typeof options !== 'object') {
    throw new Error('express-rate-limit: options object is required');
  }

  if (!Number.isFinite(options.windowMs)) {
    throw new Error('express-rate-limit: windowMs must be a finite number');
  }

  if (!Number.isFinite(options.max)) {
    throw new Error('express-rate-limit: max must be a finite number');
  }

  return createHandler(options);
};

export default rateLimit;
