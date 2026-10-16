import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/AdminModule/auth/server", () => ({ requireStaff: vi.fn(async () => ({})) }));
vi.mock("@/AdminModule/invitations/actions", () => ({ saveInvitationAction: vi.fn() }));
vi.mock("@/AdminModule/invitations/data", () => ({
  getInvitation: vi.fn(async () => ({ id: "inv-1", previewToken: "tok" })), regenerateTokenRecord: vi.fn(),
}));
vi.mock("@/AdminModule/invitations/publishActions", () => ({
  checkSlugAction: vi.fn(), setSlugAction: vi.fn(), newPreviewLinkAction: vi.fn(), publishAction: vi.fn(), updateLiveAction: vi.fn(),
}));
vi.mock("@/AdminModule/invitations/lifecycleActions", () => ({
  takeOfflineAction: vi.fn(), putOnlineAction: vi.fn(), setOfflineOnAction: vi.fn(),
  deleteInvitationAction: vi.fn(), restoreInvitationAction: vi.fn(), eraseNowAction: vi.fn(),
}));
vi.mock("@/AdminModule/music/data", () => ({ listMusicTracks: vi.fn(async () => []) }));
vi.mock("@/AdminModule/invitations/templateChoices", () => ({ templateChoices: () => [] }));
vi.mock("@/AdminModule/editor/EditorShell", () => ({ default: () => null }));
vi.mock("@/AdminModule/editor/stepNumber", () => ({ stepNumber: () => 1 }));

import * as lifecycle from "@/AdminModule/invitations/lifecycleActions";
import EditInvitationPage from "./page";

describe("edit page", () => {
  it("passes the six lifecycle actions to the editor", async () => {
    const el = await EditInvitationPage({ params: { id: "inv-1" }, searchParams: {} });
    expect(Object.keys(el.props.lifecycleActions).sort()).toEqual(Object.keys(lifecycle).sort());
    for (const [name, fn] of Object.entries(lifecycle)) expect(el.props.lifecycleActions[name]).toBe(fn);
  });
});
