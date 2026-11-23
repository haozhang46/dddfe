import { describe, expect, it } from "vitest";
import { parseAuthJson } from "../../domain/user";
import { idpPrincipalToAuthJson, idpPrincipalToSession, type IdpPrincipal } from "./authAcl";

const editor: IdpPrincipal = {
  sub: "u-editor",
  preferred_name: "Editor",
  realm_access: ["ROLE_EDITOR", "ROLE_UNKNOWN"],
  granted: ["ORD_VIEW", "ORD_EDIT", "ORD_SUBMIT", "ORD_UNKNOWN", "ORD_VIEW"],
  auth_time: 1,
};

describe("authAcl", () => {
  it("translates IdP codes into this context's session", () => {
    expect(idpPrincipalToSession(editor)).toEqual({
      userId: "u-editor",
      displayName: "Editor",
      roles: ["editor"],
      permissions: ["order:view", "order:edit", "order:submit"],
      issuedAt: 1,
    });
  });

  it("emits authJson that domain parseAuthJson accepts", () => {
    const session = parseAuthJson(idpPrincipalToAuthJson(editor));
    expect(session?.displayName).toBe("Editor");
    expect(session?.permissions).toContain("order:submit");
  });

  it("maps the pay-type grant and drops an empty subject", () => {
    const session = idpPrincipalToSession({
      ...editor,
      sub: "u-admin",
      preferred_name: "Admin",
      realm_access: ["ROLE_ADMIN"],
      granted: ["ORD_PAY", "ADM_PANEL"],
    });
    expect(session.permissions).toEqual(["order:field:payType", "admin:panel"]);
    expect(() => idpPrincipalToSession({ ...editor, sub: "" })).toThrow(/sub/);
  });
});
