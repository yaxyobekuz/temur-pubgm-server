// Permission keys (the seed writes the same keys to the DB)
export const PERMISSIONS = Object.freeze({
  USERS_READ: "users.read",
  ACTIVITY_LOGS_READ: "activity_logs.read",

  REGIONS_READ: "regions.read",
  REGIONS_CREATE: "regions.create",
  REGIONS_UPDATE: "regions.update",
  REGIONS_DELETE: "regions.delete",

  TEAMS_READ: "teams.read",
  TEAMS_UPDATE: "teams.update",
  TEAMS_DELETE: "teams.delete",

  TOURNAMENTS_READ: "tournaments.read",
  TOURNAMENTS_CREATE: "tournaments.create",
  TOURNAMENTS_UPDATE: "tournaments.update",
  TOURNAMENTS_DELETE: "tournaments.delete",
  TOURNAMENTS_REGISTER: "tournaments.register",

  GROUPS_UPDATE: "groups.update",

  REGISTRATIONS_READ: "registrations.read",
  REGISTRATIONS_UPDATE: "registrations.update",

  BROADCASTS_READ: "broadcasts.read",
  BROADCASTS_CREATE: "broadcasts.create",
  BROADCASTS_UPDATE: "broadcasts.update",
  BROADCASTS_DELETE: "broadcasts.delete",

  HELP_LINKS_READ: "help_links.read",
  HELP_LINKS_CREATE: "help_links.create",
  HELP_LINKS_UPDATE: "help_links.update",
  HELP_LINKS_DELETE: "help_links.delete",
});

export const PERMISSION_LABELS = {
  [PERMISSIONS.USERS_READ]: { label: "Foydalanuvchilarni ko'rish", group: "users" },
  [PERMISSIONS.ACTIVITY_LOGS_READ]: { label: "Faoliyat loglarini ko'rish", group: "audit" },

  [PERMISSIONS.REGIONS_READ]: { label: "Mintaqalarni ko'rish", group: "regions" },
  [PERMISSIONS.REGIONS_CREATE]: { label: "Mintaqa yaratish", group: "regions" },
  [PERMISSIONS.REGIONS_UPDATE]: { label: "Mintaqani tahrirlash", group: "regions" },
  [PERMISSIONS.REGIONS_DELETE]: { label: "Mintaqani o'chirish", group: "regions" },

  [PERMISSIONS.TEAMS_READ]: { label: "Komandalarni ko'rish", group: "teams" },
  [PERMISSIONS.TEAMS_UPDATE]: { label: "Komandani tahrirlash", group: "teams" },
  [PERMISSIONS.TEAMS_DELETE]: { label: "Komandani o'chirish", group: "teams" },

  [PERMISSIONS.TOURNAMENTS_READ]: { label: "Turnirlarni ko'rish", group: "tournaments" },
  [PERMISSIONS.TOURNAMENTS_CREATE]: { label: "Turnir yaratish", group: "tournaments" },
  [PERMISSIONS.TOURNAMENTS_UPDATE]: { label: "Turnirni tahrirlash", group: "tournaments" },
  [PERMISSIONS.TOURNAMENTS_DELETE]: { label: "Turnirni o'chirish", group: "tournaments" },
  [PERMISSIONS.TOURNAMENTS_REGISTER]: { label: "Turnirga ro'yxatdan o'tish", group: "tournaments" },

  [PERMISSIONS.GROUPS_UPDATE]: { label: "Guruhlarni boshqarish", group: "tournaments" },

  [PERMISSIONS.REGISTRATIONS_READ]: { label: "Ro'yxatdan o'tganlarni ko'rish", group: "tournaments" },
  [PERMISSIONS.REGISTRATIONS_UPDATE]: { label: "Ro'yxatdan o'tganni boshqarish", group: "tournaments" },

  [PERMISSIONS.BROADCASTS_READ]: { label: "Xabarnomalarni ko'rish", group: "broadcasts" },
  [PERMISSIONS.BROADCASTS_CREATE]: { label: "Xabarnoma yaratish", group: "broadcasts" },
  [PERMISSIONS.BROADCASTS_UPDATE]: { label: "Xabarnomani tahrirlash", group: "broadcasts" },
  [PERMISSIONS.BROADCASTS_DELETE]: { label: "Xabarnomani o'chirish", group: "broadcasts" },

  [PERMISSIONS.HELP_LINKS_READ]: { label: "Yordam havolalarini ko'rish", group: "help_links" },
  [PERMISSIONS.HELP_LINKS_CREATE]: { label: "Yordam havolasi qo'shish", group: "help_links" },
  [PERMISSIONS.HELP_LINKS_UPDATE]: { label: "Yordam havolasini tahrirlash", group: "help_links" },
  [PERMISSIONS.HELP_LINKS_DELETE]: { label: "Yordam havolasini o'chirish", group: "help_links" },
};
