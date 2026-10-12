import { describe, expect, it } from "vitest";
import { foreignMediaKeys, invitationFolder, isSafeKey, mediaKeys, removedMediaKeys } from "./mediaKeys";

const ID = "inv-1";
const own = (name) => `${invitationFolder(ID)}${name}`;

describe("isSafeKey", () => {
  it("accepts plain keys", () => {
    expect(isSafeKey("invitations/inv-1/3f9a.jpg")).toBe(true);
    expect(isSafeKey("music-library/ab_12.mp3")).toBe(true);
  });

  it("rejects keys a browser could resolve to a different file", () => {
    for (const bad of ["invitations/inv-1/../inv-2/a.jpg", "invitations//a.jpg", "/invitations/inv-1/a.jpg", "invitations/inv-1/a b.jpg", "https://x.com/a.jpg", "", null]) {
      expect(isSafeKey(bad)).toBe(false);
    }
  });
});

describe("mediaKeys", () => {
  it("lists every file the invitation uses", () => {
    const draft = {
      couple: { bride: { photoKey: own("b.jpg") }, groom: {} },
      media: { coverKey: own("c.jpg"), gallery: [{ key: own("g1.jpg") }, { caption: { en: "x" } }], music: { type: "upload", key: own("m.mp3") } },
    };
    expect(mediaKeys(draft)).toEqual([
      { field: "media.coverKey", key: own("c.jpg") },
      { field: "couple.bride.photoKey", key: own("b.jpg") },
      { field: "media.gallery.0.key", key: own("g1.jpg") },
      { field: "media.music.key", key: own("m.mp3") },
    ]);
    expect(mediaKeys({})).toEqual([]);
  });
});

describe("foreignMediaKeys", () => {
  it("accepts this invitation's files and library music", () => {
    const draft = { media: { coverKey: own("c.jpg"), music: { type: "library", trackId: "t1", key: "music-library/t.mp3" } } };
    expect(foreignMediaKeys(draft, ID)).toEqual([]);
  });

  it("flags files from another invitation, unsafe keys and full URLs", () => {
    const draft = {
      media: {
        coverKey: "invitations/inv-2/c.jpg",
        gallery: [{ key: own("../inv-2/g.jpg") }, { key: "https://example.com/g.jpg" }],
        music: { type: "upload", key: "music-library/t.mp3" },
      },
    };
    expect(foreignMediaKeys(draft, ID)).toEqual([
      "invitations/inv-2/c.jpg",
      own("../inv-2/g.jpg"),
      "https://example.com/g.jpg",
      "music-library/t.mp3",
    ]);
  });

  it("flags library music that isn't in the library folder", () => {
    expect(foreignMediaKeys({ media: { music: { type: "library", trackId: "t1", key: own("m.mp3") } } }, ID)).toEqual([own("m.mp3")]);
  });
});

describe("removedMediaKeys", () => {
  it("returns this invitation's files that the new version no longer uses", () => {
    const before = { media: { coverKey: own("old.jpg"), gallery: [{ key: own("g1.jpg") }, { key: own("g2.jpg") }] } };
    const after = { media: { coverKey: own("new.jpg"), gallery: [{ key: own("g2.jpg") }] } };
    expect(removedMediaKeys(before, after, ID).sort()).toEqual([own("g1.jpg"), own("old.jpg")]);
  });

  it("never returns library files or files that moved within the invitation", () => {
    const before = { media: { coverKey: own("a.jpg"), music: { type: "library", trackId: "t1", key: "music-library/t.mp3" } } };
    const after = { media: { gallery: [{ key: own("a.jpg") }] } };
    expect(removedMediaKeys(before, after, ID)).toEqual([]);
  });
});
