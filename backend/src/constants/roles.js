// Roles a user can hold. 'admin' is never assignable at registration —
// only via manual promotion (updateUserRole, admin-only route).
const ASSIGNABLE_ROLES = ['sound', 'lighting', 'media'];
const ALL_ROLES = ['admin', ...ASSIGNABLE_ROLES];

module.exports = { ASSIGNABLE_ROLES, ALL_ROLES };