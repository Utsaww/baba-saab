import { describe, expect, it, vi } from "vitest";

const getPublicInvitation = vi.hoisted(() => vi.fn());
vi.mock("@/InvitationModule/server/publicInvitation", () => ({ getPublicInvitation }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

import InvitationRenderer from "@/InvitationModule/InvitationRenderer";
import PublicInvitationPage from "./page";

const rendererProps = (tree) => [tree.props.children].flat().find((child) => child?.type === InvitationRenderer).props;

describe("PublicInvitationPage", () => {
  it("passes the slug to the template so a guest's reply is remembered per invitation", async () => {
    getPublicInvitation.mockResolvedValue({ mode: "live", invitation: { templateId: "royal" } });
    const tree = await PublicInvitationPage({ params: { slug: "asha-weds-ravi" }, searchParams: {} });
    expect(rendererProps(tree).ctx).toEqual({ mode: "live", slug: "asha-weds-ravi" });
  });

  it("marks a customer preview as a preview", async () => {
    getPublicInvitation.mockResolvedValue({ mode: "preview", invitation: { templateId: "royal" } });
    const tree = await PublicInvitationPage({ params: { slug: "asha-weds-ravi" }, searchParams: { preview: "tok" } });
    expect(rendererProps(tree).ctx.mode).toBe("preview");
  });
});
