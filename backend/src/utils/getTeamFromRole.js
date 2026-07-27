const getTeamFromRole = (role) => {
  const map = {
    sound: 'sound',
    lighting: 'lighting',
    media: 'media',
    admin: null,
  };
  return map[role] || null;
};

module.exports = getTeamFromRole;