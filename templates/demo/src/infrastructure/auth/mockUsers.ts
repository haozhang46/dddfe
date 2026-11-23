import type { IdpPrincipal } from "../acl/authAcl";

type MockUser = {
  username: string;
  principal: IdpPrincipal;
};

const users: MockUser[] = [
  {
    username: "viewer",
    principal: {
      sub: "u-viewer",
      preferred_name: "Viewer",
      realm_access: ["ROLE_VIEWER"],
      granted: ["ORD_VIEW"],
      auth_time: 1,
    },
  },
  {
    username: "editor",
    principal: {
      sub: "u-editor",
      preferred_name: "Editor",
      realm_access: ["ROLE_EDITOR"],
      granted: ["ORD_VIEW", "ORD_EDIT", "ORD_SUBMIT"],
      auth_time: 1,
    },
  },
  {
    username: "admin",
    principal: {
      sub: "u-admin",
      preferred_name: "Admin",
      realm_access: ["ROLE_ADMIN"],
      granted: ["ORD_VIEW", "ORD_EDIT", "ORD_SUBMIT", "ORD_PAY", "ADM_PANEL"],
      auth_time: 1,
    },
  },
];

export function listMockUsernames(): string[] {
  return users.map((user) => user.username);
}

/** What the mock identity provider returns before the anti-corruption layer runs. */
export function idpPrincipalForUsername(username: string): IdpPrincipal | null {
  const user = users.find((candidate) => candidate.username === username);
  if (!user) return null;
  return {
    ...user.principal,
    realm_access: [...user.principal.realm_access],
    granted: [...user.principal.granted],
    auth_time: Date.now(),
  };
}
