const rateLimit = require("express-rate-limit");

// General API rate limiter (e.g., 100 requests per 15 minutes)
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { message: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Stricter auth limiter (e.g., 10 requests per hour)
exports.authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10, 
  message: { message: "Too many authentication attempts from this IP, please try again after an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});