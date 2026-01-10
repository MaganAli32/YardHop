/**
 * ============================================================
 * RATE LIMITING MIDDLEWARE
 * Different rate limits for different endpoints
 * ============================================================
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Standard API rate limit
 * 100 requests per 15 minutes
 */
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many requests, please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limit for sensitive operations
 * 10 requests per 15 minutes
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: 'Rate Limit Exceeded',
    message: 'Too many requests for this sensitive operation.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limit (login/signup)
 * 5 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: 'Too Many Attempts',
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * AI endpoint rate limit
 * 20 requests per hour (AI calls are expensive)
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    error: 'AI Rate Limit Exceeded',
    message: 'Too many AI requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP (IPv6 safe)
    return req.user?.id || ipKeyGenerator(req);
  },
});

/**
 * Upload rate limit
 * 50 uploads per hour
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: {
    error: 'Upload Rate Limit Exceeded',
    message: 'Too many uploads. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP (IPv6 safe)
    return req.user?.id || ipKeyGenerator(req);
  },
});

/**
 * Message rate limit
 * 60 messages per minute (prevents spam)
 */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    error: 'Message Rate Limit Exceeded',
    message: 'Slow down! Too many messages sent.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP (IPv6 safe)
    return req.user?.id || ipKeyGenerator(req);
  },
});

/**
 * Search rate limit
 * 60 searches per minute
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    error: 'Search Rate Limit Exceeded',
    message: 'Too many searches. Please wait a moment.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  standardLimiter,
  strictLimiter,
  authLimiter,
  aiLimiter,
  uploadLimiter,
  messageLimiter,
  searchLimiter,
};
