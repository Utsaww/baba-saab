import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { EDITABLE_TEXT_KEYS, UI } from "../lib/ui-strings";
import { TEMPLATES } from "./registry";

const overrideAll = Object.fromEntries(EDITABLE_TEXT_KEYS.map((key) => [key, { en: `ZZ ${key}.` }]));
// A past wedding date shows the "begun" line; a far deadline keeps the RSVP form open. Every section has content.
const build = (template, language) =>
  parseInvitation({
    ...template.sample,
    language,
    mainDate: "2020-01-01",
    rsvp: { ...template.sample.rsvp, deadline: "2099-12-31" },
    media: { ...template.sample.media, film: { type: "youtube", url: "https://youtu.be/abcdefghijk" } },
    custom: { text: overrideAll },
  });
// With the opening, so lines inside it count too.
const text = (inv) => render(<InvitationRenderer invitation={inv} />).container.textContent;

describe.each(TEMPLATES)("wording in $id", (template) => {
  it("shows an override for every key it lists, and lists every key it shows", () => {
    const t = text(build(template, "en"));
    const shown = EDITABLE_TEXT_KEYS.filter((key) => t.includes(`ZZ ${key}.`));
    expect(shown).toEqual(EDITABLE_TEXT_KEYS.filter((key) => template.textKeys.includes(key)));
  });

  it("keeps the template's Hindi line when only English was rewritten", () => {
    const t = text(build(template, "hi"));
    expect(t).not.toContain("ZZ ");
    for (const key of template.textKeys) expect(t).toContain(UI[key].hi);
  });
});
