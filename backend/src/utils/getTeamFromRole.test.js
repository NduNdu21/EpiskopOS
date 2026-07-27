const getTeamFromRole = require('./getTeamFromRole');

describe('getTeamFromRole', () => {
  test('maps sound role to sound team', () => {
    expect(getTeamFromRole('sound')).toBe('sound');
  });
  test('maps lighting role to lighting team', () => {
    expect(getTeamFromRole('lighting')).toBe('lighting');
  });
  test('maps media role to media team', () => {
    expect(getTeamFromRole('media')).toBe('media');
  });
  test('admin has no single team', () => {
    expect(getTeamFromRole('admin')).toBeNull();
  });
  test('unknown role returns null', () => {
    expect(getTeamFromRole('volunteer')).toBeNull();
  });
});