// Only `owner` is hard-coded as a static role.
// Other role values (admin, leader, player) live in the `Role` collection (seeded).
export const ROLES = Object.freeze({
  OWNER: "owner",
  ADMIN: "admin",
  LEADER: "leader",
  PLAYER: "player",
});

export const ALL_ROLES = Object.values(ROLES);

// Roles that the user can switch between via the self-endpoint.
export const SELF_SWITCHABLE_ROLES = Object.freeze([ROLES.LEADER, ROLES.PLAYER]);
