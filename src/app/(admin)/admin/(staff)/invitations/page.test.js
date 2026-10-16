import { describe, expect, it, vi } from "vitest";

vi.mock("@/AdminModule/auth/server", () => ({ requireStaff: vi.fn(async () => ({})) }));
vi.mock("@/AdminModule/invitations/data", () => ({ listInvitations: vi.fn(async () => []) }));
vi.mock("@/AdminModule/invitations/lifecycleActions", () => ({
  takeOfflineAction: vi.fn(), putOnlineAction: vi.fn(), setOfflineOnAction: vi.fn(),
  deleteInvitationAction: vi.fn(), restoreInvitationAction: vi.fn(), eraseNowAction: vi.fn(),
}));

import * as lifecycle from "@/AdminModule/invitations/lifecycleActions";
import InvitationsPage from "./page";

describe("invitations page", () => {
  it("passes the take offline, delete and restore actions to the list", async () => {
    const el = await InvitationsPage();
    const list = el.props.children[1];
    expect(Object.keys(list.props.actions).sort()).toEqual(["deleteInvitationAction", "restoreInvitationAction", "takeOfflineAction"]);
    for (const [name, fn] of Object.entries(list.props.actions)) expect(fn).toBe(lifecycle[name]);
  });
});
