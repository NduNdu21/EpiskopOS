// Blocks access to routes it's applied to until the user has set a username.
// Apply AFTER authMiddleware in each protected router, e.g.:
//   router.use(authMiddleware);
//   router.use(requireUsername);
// Do NOT apply this to the /api/auth/username route itself — that's how
// users escape the block. See authRoutes.js for the exemption pattern.
const requireUsername = (req, res, next) => {
  if (!req.user?.username) {
    return res.status(403).json({
      message: "Please set a username before continuing.",
      code: "USERNAME_REQUIRED",
    });
  }
  next();
};

module.exports = requireUsername;