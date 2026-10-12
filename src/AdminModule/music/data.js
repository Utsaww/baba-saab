import { cookieDataClient } from "@/AdminModule/dataClient";

const TRACK_FIELDS = ["id", "name", "key", "durationSec", "createdBy", "createdAt"];

function failIfErrors(errors) {
  if (errors?.length) throw new Error(errors.map((e) => e.message).join("; "));
}

export async function listMusicTracks() {
  const client = cookieDataClient();
  const tracks = [];
  let nextToken = null;
  do {
    const page = await client.models.MusicTrack.list({ selectionSet: TRACK_FIELDS, limit: 100, nextToken });
    failIfErrors(page.errors);
    tracks.push(...page.data);
    nextToken = page.nextToken;
  } while (nextToken);
  return tracks.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMusicTrack(id) {
  const { data, errors } = await cookieDataClient().models.MusicTrack.get({ id }, { selectionSet: TRACK_FIELDS });
  failIfErrors(errors);
  return data ?? null;
}

export async function createMusicTrackRecord({ name, key, durationSec, email }) {
  const { data, errors } = await cookieDataClient().models.MusicTrack.create({ name, key, durationSec, createdBy: email });
  failIfErrors(errors);
  if (!data) throw new Error("MusicTrack.create returned no data");
  return { id: data.id, name: data.name, key: data.key, durationSec: data.durationSec, createdBy: data.createdBy, createdAt: data.createdAt };
}

export async function renameMusicTrackRecord(id, name) {
  const { errors } = await cookieDataClient().models.MusicTrack.update({ id, name });
  failIfErrors(errors);
}

export async function deleteMusicTrackRecord(id) {
  const { errors } = await cookieDataClient().models.MusicTrack.delete({ id });
  failIfErrors(errors);
}
