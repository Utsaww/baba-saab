"use server";

import { requireStaff } from "@/AdminModule/auth/server";
import { makeVideoRecord, videoStatusRecord } from "./data";

const VIDEO_FAILED = "Couldn't reach the video service. Check your connection and try again.";

/** Runs one video call; a GraphQL error's message (e.g. "Only a live invitation can have a video.") is shown as is. */
async function run(call) {
  try {
    const { data, errors } = await call();
    if (errors?.length || !data) return { ok: false, message: errors?.[0]?.message ?? VIDEO_FAILED };
    return { ok: true, ...data };
  } catch (err) {
    console.error("video action failed", err);
    return { ok: false, message: VIDEO_FAILED };
  }
}

export async function makeVideoAction({ id }) {
  await requireStaff();
  return run(() => makeVideoRecord({ id }));
}

export async function videoStatusAction({ id }) {
  await requireStaff();
  return run(() => videoStatusRecord({ id }));
}
