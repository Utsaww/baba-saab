"use client";

import { invitationFolder } from "@/InvitationModule/lib/mediaKeys";
import { youtubeId } from "@/InvitationModule/lib/media";
import { Group, TextInput } from "../fields";
import GalleryEditor from "../media/GalleryEditor";
import MusicPicker from "../media/MusicPicker";
import PhotoSlot from "../media/PhotoSlot";

export default function MediaStep({ content, update, errors, language, invitationId, musicTracks = [], uploads }) {
  const folder = invitationFolder(invitationId);
  const url = content.media?.film?.url ?? "";
  const invalid = Boolean(url) && (!youtubeId(url) || Boolean(errors["media.film.url"]));

  return (
    <div className="space-y-6">
      <Group title="Cover photo">
        <PhotoSlot label="Cover photo" group="cover" value={content.media?.coverKey} onChange={(key) => update(["media", "coverKey"], key)} folder={folder} uploads={uploads} />
      </Group>

      <Group title="Couple photos (optional)">
        <div className="grid gap-6 sm:grid-cols-2">
          <PhotoSlot label="Bride's photo" group="bride" value={content.couple?.bride?.photoKey} onChange={(key) => update(["couple", "bride", "photoKey"], key)} folder={folder} uploads={uploads} />
          <PhotoSlot label="Groom's photo" group="groom" value={content.couple?.groom?.photoKey} onChange={(key) => update(["couple", "groom", "photoKey"], key)} folder={folder} uploads={uploads} />
        </div>
      </Group>

      <Group title="Photo gallery">
        <GalleryEditor gallery={content.media?.gallery} update={update} folder={folder} uploads={uploads} language={language} error={errors["media.gallery"]} />
      </Group>

      <Group title="Invitation film">
        <TextInput
          label="YouTube link"
          type="url"
          value={url}
          error={invalid ? "Paste a YouTube link, like https://youtu.be/…" : undefined}
          hint="Upload the film to YouTube (it can be unlisted), then paste its link here."
          onChange={(v) => update(["media", "film"], v.trim() ? { type: "youtube", url: v.trim() } : undefined)}
        />
      </Group>

      <Group title="Background music">
        <MusicPicker music={content.media?.music} onChange={(music) => update(["media", "music"], music)} tracks={musicTracks} folder={folder} uploads={uploads} />
      </Group>
    </div>
  );
}
