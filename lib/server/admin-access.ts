import "server-only";

export {
  canAccessAdminDatabaseTable,
  canAccessAnyDatabase,
  canAccessBlogAdmin,
  canAccessFantasyAdmin,
  getAdminDefaultRedirectPathForRole,
  getVisibleAdminDatabaseTableIds,
  shouldLimitEventFighterIntakesToCurrentEvent,
} from "@/lib/admin/role-access";
export type { AdminBackofficeRole } from "@/lib/admin/role-access";
