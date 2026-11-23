import { createAuthSession, type AuthSession } from "../../domain/user";

/**
 * Identity-provider principal. Grant and role codes belong to that system.
 * The session document stored by this app is produced only after this translation.
 */
export type IdpPrincipal = {
  sub: string;
  preferred_name: string;
  realm_access: readonly string[];
  granted: readonly string[];
  auth_time: number;
};

const PERMISSION_BY_GRANT: Record<string, string> = {
  ORD_VIEW: "order:view",
  ORD_EDIT: "order:edit",
  ORD_SUBMIT: "order:submit",
  ORD_PAY: "order:field:payType",
  ADM_PANEL: "admin:panel",
};

const ROLE_BY_REALM: Record<string, string> = {
  ROLE_VIEWER: "viewer",
  ROLE_EDITOR: "editor",
  ROLE_ADMIN: "admin",
};

export function idpPrincipalToSession(principal: IdpPrincipal): AuthSession {
  if (typeof principal.sub !== "string" || principal.sub.length === 0) {
    throw new Error("ACL sub required");
  }
  if (typeof principal.preferred_name !== "string") {
    throw new Error("ACL preferred_name must be a string");
  }
  if (!Array.isArray(principal.realm_access) || !Array.isArray(principal.granted)) {
    throw new Error("ACL realm_access and granted must be arrays");
  }
  if (typeof principal.auth_time !== "number" || !Number.isFinite(principal.auth_time)) {
    throw new Error("ACL auth_time must be a finite number");
  }

  return createAuthSession({
    userId: principal.sub,
    displayName: principal.preferred_name,
    roles: unique(principal.realm_access.flatMap(mapRole)),
    permissions: unique(principal.granted.flatMap(mapGrant)),
    issuedAt: principal.auth_time,
  });
}

export function idpPrincipalToAuthJson(principal: IdpPrincipal): string {
  return JSON.stringify(idpPrincipalToSession(principal));
}

function mapRole(role: string): string[] {
  const mapped = ROLE_BY_REALM[role];
  return mapped ? [mapped] : [];
}

function mapGrant(grant: string): string[] {
  const mapped = PERMISSION_BY_GRANT[grant];
  return mapped ? [mapped] : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
