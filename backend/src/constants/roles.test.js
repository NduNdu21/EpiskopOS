const { ASSIGNABLE_ROLES, ALL_ROLES } = require('./roles');

describe('role constants', () => {
  test('assignable roles excludes admin', () => {
    expect(ASSIGNABLE_ROLES).not.toContain('admin');
  });
  test('all roles includes admin plus assignable roles', () => {
    expect(ALL_ROLES).toEqual(expect.arrayContaining(['admin', ...ASSIGNABLE_ROLES]));
  });
});