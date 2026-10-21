/**
 * @file rateLimiter.js
 * @description In-memory rate limiting middleware for sensitive endpoints.
 * Protects against brute-force login attacks and API abuse.
 */

const attemptsMap = new Map();

// Periodic cleanup of expired rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attemptsMap.entries()) {
    if (now - record.firstAttemptTime > record.windowMs) {
      attemptsMap.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref();

/**
 * Creates a rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max - Maximum allowed requests per window (default: 10)
 * @param {string} options.message - Error message when limit exceeded
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 15, message = 'Too many requests. Please try again later.' } = {}) {
  return function rateLimiter(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    let record = attemptsMap.get(ip);
    if (!record || (now - record.firstAttemptTime > windowMs)) {
      record = { count: 1, firstAttemptTime: now, windowMs };
      attemptsMap.set(ip, record);
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.windowMs - (now - record.firstAttemptTime)) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: `${retryAfterSeconds} seconds`
      });
    }

    next();
  };
}

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 12,                  // 12 attempts per 15 minutes per IP
  message: 'Too many login attempts from this IP address. For your security, please wait 15 minutes before trying again.'
});

module.exports = {
  createRateLimiter,
  loginRateLimiter
};
