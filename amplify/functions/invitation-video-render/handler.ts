import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import ffmpeg from "ffmpeg-static";
import { concatList, encode, ffmpegArgs } from "./encode";
import { failJob, finishJob } from "./job";
import { record } from "./record";

export type RenderEvent = { id: string; slug: string; liveVersion: number; job: string; musicKey?: string };

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const TMP = "/tmp/video";
// Ids are UUIDs: letters, digits and dashes only, so the key can never climb out of the invitation's own folder.
const SAFE_ID = /^[A-Za-z0-9-]{8,}$/;
const NO_MUSIC = "Made without music: the track couldn't be read";

export const handler = async (event: RenderEvent) => {
  const table = process.env.INVITATION_TABLE!;
  const bucket = process.env.INVITATION_MEDIA_BUCKET!;
  if (!SAFE_ID.test(event.id)) throw new Error(`unsafe id ${JSON.stringify(event.id)}`);
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  try {
    // The same public URL guests' phones load (src/InvitationModule/lib/media.js); full URLs pass through.
    let musicFile: string | undefined;
    let note: string | undefined;
    if (event.musicKey) {
      const url = /^https?:\/\//.test(event.musicKey)
        ? event.musicKey
        : `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${event.musicKey.replace(/^\//, "")}`;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
        if (!res.ok) throw new Error(`music ${res.status}`);
        musicFile = path.join(TMP, "music");
        fs.writeFileSync(musicFile, Buffer.from(await res.arrayBuffer()));
      } catch (err) {
        console.warn("video: continuing without music", event.id, err);
        musicFile = undefined;
        note = NO_MUSIC;
      }
    }

    const framesDir = path.join(TMP, "frames");
    fs.mkdirSync(framesDir);
    const url = `${process.env.VIDEO_SITE_ORIGIN}/invitation/${encodeURIComponent(event.slug)}`;
    const { frames, seconds, tapAt } = await record({ url, tmpDir: framesDir });
    const listFile = path.join(TMP, "list.txt");
    fs.writeFileSync(listFile, concatList(frames));
    const out = path.join(TMP, "out.mp4");
    await encode(ffmpeg!, ffmpegArgs({ listFile, musicFile, musicDelay: tapAt, seconds, out }));

    const key = `invitations/${event.id}/video/${randomUUID()}.mp4`;
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: fs.readFileSync(out), ContentType: "video/mp4" }));

    const before = await db.send(new GetCommand({ TableName: table, Key: { id: event.id }, ProjectionExpression: "videoKey" }));
    const previous: string | undefined = before.Item?.videoKey;
    const finished = await finishJob(db, table, { id: event.id, job: event.job, key, note }, new Date().toISOString());
    // Finished: the previous video is replaced. Not finished: a newer job owns the record, so this file is nobody's.
    if (finished) {
      if (previous && previous !== key) await removeQuietly(bucket, previous);
    } else {
      await removeQuietly(bucket, key);
    }
    return { key, finished, seconds };
  } catch (err) {
    // A failing failJob must not hide why the render failed.
    await failJob(db, table, { id: event.id, job: event.job }, new Date().toISOString()).catch((e) =>
      console.error("video: could not mark the job failed", event.id, e),
    );
    throw err;
  } finally {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
};

// Only ever inside invitations/<id>/video/ (the role can't delete anything else). A failed delete leaves an orphan
// file, which erase cleans up with the invitation; it must not turn a finished video into a failed job.
async function removeQuietly(bucket: string, key: string) {
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (err) {
    console.warn("video: could not delete", key, err);
  }
}
