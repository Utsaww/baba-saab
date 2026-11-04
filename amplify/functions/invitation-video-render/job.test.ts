import { describe, expect, it, vi } from "vitest";
import { failJob, finishJob } from "./job";

const NOW = "2026-11-04T10:00:00.000Z";
const condFail = () => Object.assign(new Error("cond"), { name: "ConditionalCheckFailedException" });

function fakeDb(fail?: () => Error) {
  const calls: any[] = [];
  return {
    calls,
    send: vi.fn(async (cmd: any) => {
      calls.push(cmd);
      if (fail) throw fail();
      return {};
    }),
  };
}

describe("finishJob", () => {
  it("finishJob writes ready only for its own job", async () => {
    const db = fakeDb();
    const key = "invitations/inv-1/video/abc.mp4";
    await expect(finishJob(db, "Inv", { id: "inv-1", job: "job-1", key, note: "Made without music" }, NOW)).resolves.toBe(true);
    const input = db.calls[0].input;
    expect(input).toMatchObject({ TableName: "Inv", Key: { id: "inv-1" } });
    expect(input.ConditionExpression).toBe("videoJob = :job AND #s = :published AND liveVersion = videoLiveVersion");
    expect(input.ExpressionAttributeNames).toEqual({ "#s": "status" });
    expect(input.ExpressionAttributeValues).toMatchObject({ ":published": "published" });
    expect(input.ExpressionAttributeValues).toMatchObject({
      ":job": "job-1",
      ":status": "ready",
      ":key": key,
      ":note": "Made without music",
      ":now": NOW,
    });
  });
  it("stores no note as null (the document client refuses undefined)", async () => {
    const db = fakeDb();
    await finishJob(db, "Inv", { id: "inv-1", job: "job-1", key: "k" }, NOW);
    expect(db.calls[0].input.ExpressionAttributeValues[":note"]).toBeNull();
  });
  it("finishJob returns false when a newer job owns the record", async () => {
    const db = fakeDb(condFail);
    await expect(finishJob(db, "Inv", { id: "inv-1", job: "old", key: "k" }, NOW)).resolves.toBe(false);
  });
  it("passes on other errors", async () => {
    const db = fakeDb(() => new Error("Throttled"));
    await expect(finishJob(db, "Inv", { id: "inv-1", job: "j", key: "k" }, NOW)).rejects.toThrow("Throttled");
  });
});

describe("failJob", () => {
  it("marks its own job failed", async () => {
    const db = fakeDb();
    await failJob(db, "Inv", { id: "inv-1", job: "job-1" }, NOW);
    const input = db.calls[0].input;
    expect(input.ConditionExpression).toContain("videoJob = :job");
    expect(input.ExpressionAttributeValues).toMatchObject({ ":job": "job-1", ":status": "failed" });
  });
  it("failJob ignores a lost condition", async () => {
    const db = fakeDb(condFail);
    await expect(failJob(db, "Inv", { id: "inv-1", job: "old" }, NOW)).resolves.toBeUndefined();
  });
});
