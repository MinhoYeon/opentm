export const ADMIN_ROLES = [
  "super_admin",
  "operations_admin",
  "finance_admin",
  "support_admin",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminCapabilityKey =
  | "canManageStatuses"
  | "canManagePayments"
  | "canUploadDocuments"
  | "canManageAdmins"
  | "canViewAuditLogs"
  | "canPurgeAuditLogs"
  | "canUseBulkActions"
  | "canCreateManualEntry";

export type AdminCapabilities = Record<AdminCapabilityKey, boolean>;

type AdminRoleDefinition = {
  label: string;
  inherits?: AdminRole[];
  capabilities: Partial<AdminCapabilities>;
};

const ROLE_DEFINITIONS: Record<AdminRole, AdminRoleDefinition> = {
  super_admin: {
    label: "Super Admin",
    capabilities: {
      canManageStatuses: true,
      canManagePayments: true,
      canUploadDocuments: true,
      canManageAdmins: true,
      canViewAuditLogs: true,
      canPurgeAuditLogs: true,
      canUseBulkActions: true,
      canCreateManualEntry: true,
    },
  },
  operations_admin: {
    label: "Operations Admin",
    capabilities: {
      canManageStatuses: true,
      canManagePayments: false,
      canUploadDocuments: true,
      canManageAdmins: false,
      canViewAuditLogs: true,
      canPurgeAuditLogs: false,
      canUseBulkActions: true,
      canCreateManualEntry: true,
    },
  },
  finance_admin: {
    label: "Finance Admin",
    capabilities: {
      canManageStatuses: false,
      canManagePayments: true,
      canUploadDocuments: false,
      canManageAdmins: false,
      canViewAuditLogs: true,
      canPurgeAuditLogs: false,
      canUseBulkActions: true,
      canCreateManualEntry: false,
    },
  },
  support_admin: {
    label: "Support Admin",
    capabilities: {
      canManageStatuses: false,
      canManagePayments: false,
      canUploadDocuments: false,
      canManageAdmins: false,
      canViewAuditLogs: true,
      canPurgeAuditLogs: false,
      canUseBulkActions: false,
      canCreateManualEntry: false,
    },
  },
};

type SupabaseUserLike = {
  id?: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

function resolveRoleFromMetadata(metadata: Record<string, unknown> | null | undefined):
  | AdminRole
  | null {
  if (!metadata) {
    return null;
  }

  const role = metadata.role;
  if (typeof role === "string" && (ADMIN_ROLES as readonly string[]).includes(role)) {
    return role as AdminRole;
  }

  const roles = metadata.roles;
  if (Array.isArray(roles)) {
    for (const candidate of roles) {
      if (typeof candidate === "string" && (ADMIN_ROLES as readonly string[]).includes(candidate)) {
        return candidate as AdminRole;
      }
    }
  }

  if (metadata.is_admin === true) {
    return "operations_admin";
  }

  return null;
}

export function resolveAdminRole(user: SupabaseUserLike | null | undefined): AdminRole | null {
  if (!user) {
    return null;
  }

  const appMetadataRole = resolveRoleFromMetadata(user.app_metadata);
  if (appMetadataRole) {
    return appMetadataRole;
  }

  const userMetadataRole = resolveRoleFromMetadata(user.user_metadata);
  if (userMetadataRole) {
    return userMetadataRole;
  }

  return null;
}

export function isAdminUser(user: SupabaseUserLike | null | undefined): boolean {
  return resolveAdminRole(user) !== null;
}

const DEFAULT_CAPABILITIES: AdminCapabilities = {
  canManageStatuses: false,
  canManagePayments: false,
  canUploadDocuments: false,
  canManageAdmins: false,
  canViewAuditLogs: false,
  canPurgeAuditLogs: false,
  canUseBulkActions: false,
  canCreateManualEntry: false,
};

export function getAdminCapabilities(role: AdminRole | null | undefined): AdminCapabilities {
  if (!role) {
    return { ...DEFAULT_CAPABILITIES };
  }

  const definition = ROLE_DEFINITIONS[role];
  if (!definition) {
    return { ...DEFAULT_CAPABILITIES };
  }

  return {
    ...DEFAULT_CAPABILITIES,
    ...definition.capabilities,
  };
}

export type AdminContext = {
  role: AdminRole;
  capabilities: AdminCapabilities;
};

export function resolveAdminContext(user: SupabaseUserLike | null | undefined): AdminContext | null {
  const role = resolveAdminRole(user);
  if (!role) {
    return null;
  }

  return {
    role,
    capabilities: getAdminCapabilities(role),
  };
}

