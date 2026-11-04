import { InvokeCommand } from "@aws-sdk/client-lambda";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it, vi } from "vitest";
import { handle } from "./handler";

const ID = "0f8e2c6a-1b2c-4d5e-8f90-123456789abc";
const NOW = new Date().toISOString();
const live = {
  id: ID, status: "published", slug: "rahul-priya", liveVersion: 3,
  publishedContent: JSON.stringify({ media: { music: { key: "music-library/a.mp3" } } }),
};

function setup(items: any[], updateError?: any) {
  const sent: any[] = [];
  const db = {
    send: vi.fn(async (cmd: any) => {
      sent.push(cmd);
      if (cmd instanceof GetCommand) return { Item: items.length > 1 ? items.shift() : items[0] };
      if (updateError) throw updateError;
      return {};
    }),
  };
  const invoke = vi.fn(async (_c: InvokeCommand) => ({}));
  const presign = vi.fn(async (key: string, fileName: string) => `https://s3/${key}?dl=${fileName}`);
  const deps = { db: db as any, invoke, presign, table: "T" };
  return { deps, sent, invoke, presign };
}
const ev = (fieldName: string, groups: string[] | null = ["admin"]) =>
  ({ fieldName, arguments: { id: ID }, identity: { groups } }) as any;
const failedCondition = Object.assign(new Error("x"), { name: "ConditionalCheckFailedException" });
const payload = (c: InvokeCommand) => Buffer.from(c.input.Payload as Uint8Array).toString();

describe("invitation-video handler", () => {
  it("non-staff refused", async () => {
    const { deps, invoke } = setup([live]);
    await expect(handle(ev("makeInvitationVideo", ["owner"]), deps)).rejects.toMatchObject({ name: "Forbidden" });
    await expect(handle({ fieldName: "invitationVideoStatus", arguments: { id: ID }, identity: null } as any, deps)).rejects.toMatchObject({ name: "Forbidden" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("start on a live invitation claims and invokes once", async () => {
    const { deps, sent, invoke } = setup([live]);
    await expect(handle(ev("makeInvitationVideo"), deps)).resolves.toEqual({ status: "making" });
    const update = sent.find((c) => c instanceof UpdateCommand)!.input as any;
    expect(update.ConditionExpression).toBe(
      "#s = :published AND liveVersion = :lv AND (attribute_not_exists(videoStatus) OR videoStatus <> :making OR videoStartedAt < :cutoff)",
    );
    expect(update.ExpressionAttributeValues).toMatchObject({ ":published": "published", ":lv": 3, ":making": "making" });
    expect(update.UpdateExpression).toContain("videoLiveVersion = :lv");
    expect(invoke).toHaveBeenCalledTimes(1);
    const input = invoke.mock.calls[0][0].input;
    expect(input.InvocationType).toBe("Event");
    expect(JSON.parse(payload(invoke.mock.calls[0][0]))).toEqual({
      id: ID, slug: "rahul-priya", liveVersion: 3, job: update.ExpressionAttributeValues[":job"], musicKey: "music-library/a.mp3",
    });
  });

  it("omits musicKey when there is no music (stored object form too)", async () => {
    const { deps, invoke } = setup([{ ...live, publishedContent: { media: {} } }]);
    await handle(ev("makeInvitationVideo"), deps);
    expect(payload(invoke.mock.calls[0][0])).not.toContain("musicKey");
  });

  it("second start while making returns making, no invoke", async () => {
    const making = { ...live, videoStatus: "making", videoLiveVersion: 3, videoStartedAt: NOW };
    const { deps, invoke } = setup([live, making], failedCondition);
    await expect(handle(ev("makeInvitationVideo"), deps)).resolves.toEqual({ status: "making" });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("start when ready for this version returns the link, no new job", async () => {
    const ready = { ...live, videoStatus: "ready", videoLiveVersion: 3, videoKey: `invitations/${ID}/video/v.mp4` };
    const { deps, sent, invoke } = setup([ready]);
    const out = await handle(ev("makeInvitationVideo"), deps);
    expect(out).toMatchObject({ status: "ready", fileName: "rahul-priya-invitation.mp4" });
    expect(sent.some((c) => c instanceof UpdateCommand)).toBe(false);
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each(["draft", "offline"])("start on a %s invitation refused", async (status) => {
    const { deps } = setup([{ ...live, status }]);
    await expect(handle(ev("makeInvitationVideo"), deps)).rejects.toMatchObject({
      name: "WrongStatus",
      message: "Only a live invitation can have a video.",
    });
  });

  it("status ready returns presigned url with attachment filename", async () => {
    const key = `invitations/${ID}/video/v.mp4`;
    const { deps, presign } = setup([{ ...live, videoStatus: "ready", videoLiveVersion: 3, videoKey: key, videoNote: "n" }]);
    await expect(handle(ev("invitationVideoStatus"), deps)).resolves.toEqual({
      status: "ready", url: `https://s3/${key}?dl=rahul-priya-invitation.mp4`, fileName: "rahul-priya-invitation.mp4", note: "n",
    });
    expect(presign).toHaveBeenCalledWith(key, "rahul-priya-invitation.mp4");
  });

  it("status without a video is none, and unknown errors are hidden", async () => {
    const { deps } = setup([live]);
    await expect(handle(ev("invitationVideoStatus"), deps)).resolves.toEqual({ status: "none" });
    deps.db.send = vi.fn(async () => { throw new Error("boom"); });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(handle(ev("invitationVideoStatus"), deps)).rejects.toThrow("Something went wrong. Please try again.");
  });
});
