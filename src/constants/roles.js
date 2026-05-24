// Only `owner` is a hard-coded static role.
// Additional roles are stored in the `Role` collection (dynamic).
export const ROLES = Object.freeze({
  OWNER: "owner",
});

export const ALL_ROLES = Object.values(ROLES);
