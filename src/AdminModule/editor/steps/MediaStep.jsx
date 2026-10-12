"use client";

import { youtubeId } from "@/InvitationModule/lib/media";
import { Group, TextInput } from "../fields";

export default function MediaStep({ content, update, errors }) {
  const url = content.media?.film?.url ?? "";
  const invalid = Boolean(url) && (!youtubeId(url) || Boolean(errors["media.film.url"]));

  return (
    <div className="space-y-6">
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
      <Group title="Photos and music">
        <p className="text-sm text-stone-600">Cover photo, photo gallery and background music are coming in the next release.</p>
      </Group>
    </div>
  );
}
