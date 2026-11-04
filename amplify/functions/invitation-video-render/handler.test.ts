import fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./record", () => ({ record: vi.fn() }));
vi.mock("./job", () => ({ finishJob: vi.fn(), failJob: vi.fn(async () => undefined) }));
vi.mock("./encode", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./encode")>()),
  // Stands in for ffmpeg: writes the output file the handler uploads.
  encode: vi.fn(async (_ffmpeg: string, args: string[]) => fs.writeFileSync(args.at(-1)!, "mp4")),
}));

import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { handler } from "./handler";
import { failJob, finishJob } from "./job";
import { record } from "./record";

const ID = "0f8e2c6a-1b2c-4d5e-8f90-123456789abc";
const EVENT = { id: ID, slug: "priya-weds-rahul", liveVersion: 3, job: "job-1" };
const OLD = `invitations/${ID}/video/old.mp4`;
let s3Calls: any[];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("INVITATION_TABLE", "Inv");
  vi.stubEnv("INVITATION_MEDIA_BUCKET", "media");
  vi.stubEnv("VIDEO_SITE_ORIGIN", "https://site.example");
  s3Calls = [];
  vi.spyOn(S3Client.prototype, "send").mockImplementation(async (cmd: any) => (s3Calls.push(cmd), {}));
  vi.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async () => ({ Item: { videoKey: OLD } }));
  vi.mocked(record).mockImplementation(async ({ tmpDir }) => {
    const file = `${tmpDir}/00001.jpg`;
    fs.writeFileSync(file, "jpg");
    return { frames: [{ file, t: 0 }], seconds: 20, tapAt: 1.5 };
  });
});

const deleted = () => s3Calls.filter((c) => c.constructor.name === "DeleteObjectCommand").map((c) => c.input.Key);
const uploaded = () => s3Calls.find((c) => c.constructor.name === "PutObjectCommand").input.Key;

describe("invitation-video-render handler", () => {
  it("finished: deletes the previous video, never the new one", async () => {
    vi.mocked(finishJob).mockResolvedValue(true);
    const res = await handler(EVENT);
    expect(uploaded()).toMatch(new RegExp(`^invitations/${ID}/video/[0-9a-f-]{36}\.mp4$`));
    expect(res.key).toBe(uploaded());
    expect(deleted()).toEqual([OLD]);
    expect(vi.mocked(record).mock.calls[0][0].url).toBe("https://site.example/invitation/priya-weds-rahul");
  });
  it("lost the job: deletes the file it just uploaded", async () => {
    vi.mocked(finishJob).mockResolvedValue(false);
    await handler(EVENT);
    expect(deleted()).toEqual([uploaded()]);
  });
  it("render throws: marks the job failed and rethrows the original error", async () => {
    vi.mocked(record).mockRejectedValue(new Error("Chromium crashed"));
    vi.mocked(failJob).mockRejectedValue(new Error("Throttled"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(handler(EVENT)).rejects.toThrow("Chromium crashed");
    expect(failJob).toHaveBeenCalledWith(expect.anything(), "Inv", { id: ID, job: "job-1" }, expect.any(String));
    expect(s3Calls).toEqual([]);
    log.mockRestore();
  });
});
