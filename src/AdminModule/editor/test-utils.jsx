import { useState } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import EditorShell from "./EditorShell";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { useUploads } from "@/AdminModule/media/useUploads";
import { getIn, setIn } from "./paths";

export const TEMPLATE_CHOICES = [
  {
    id: "royal",
    name: "Royal Rajasthani",
    description: "Maroon and gold.",
    palettes: [
      { id: "maroon-gold", name: "Maroon & Gold", bg: "#fff8f0", primary: "#7a1f2b" },
      { id: "ivory", name: "Ivory", bg: "#fffdf7", primary: "#a87a2a" },
    ],
  },
  {
    id: "floral",
    name: "Floral Pastel",
    description: "Soft florals.",
    palettes: [{ id: "blush", name: "Blush", bg: "#fff5f6", primary: "#c27a8a" }],
  },
];

/** Renders a step with real editor state, the way EditorShell does. `latest()` returns the current content. */
export function renderStep(Step, initial, extraProps = {}) {
  let current = initial;
  function Harness() {
    const [content, setContent] = useState(initial);
    current = content;
    const uploads = useUploads();
    const update = (path, value) => setContent((c) => setIn(c, path, typeof value === "function" ? value(getIn(c, path)) : value));
    const { errors } = cleanDraft(content);
    return (
      <Step
        content={content}
        update={update}
        errors={errors}
        language={content.language ?? "en"}
        templates={TEMPLATE_CHOICES}
        onGoToStep={() => {}}
        invitationId="inv-test"
        musicTracks={[]}
        uploads={uploads}
        {...extraProps}
      />
    );
  }
  const utils = render(<Harness />);
  return { ...utils, latest: () => current };
}

export const DRAFT_LIVE_FIELDS = {
  status: "draft",
  slug: "priya-weds-rahul-k3f9",
  previewToken: "tok_1",
  liveVersion: null,
  publishedContent: null,
  offlineOn: null,
  offlineAt: null,
  deletedAt: null,
  purgeAt: null,
};

/** Everything the publish checklist needs. */
export const COMPLETE_CONTENT = {
  templateId: "royal",
  theme: { palette: "maroon-gold" },
  language: "en",
  couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } },
  mainDate: "2027-02-14",
  venue: { name: { en: "Riviera" }, address: { en: "MG Road" } },
};

/**
 * Renders the whole editor for invitation "inv-test" with mocked server actions. Each save answers with the next version.
 * Returns the invitation, `saveAction`, and the `publishActions` and `lifecycleActions` mocks alongside the usual render result.
 */
export function renderEditor({ invitation = {}, publishActions = {}, lifecycleActions = {}, saveAction, initialStep = 2 } = {}) {
  const inv = { id: "inv-test", version: 5, content: COMPLETE_CONTENT, ...DRAFT_LIVE_FIELDS, ...invitation };
  const save = saveAction ?? vi.fn(async ({ expectedVersion }) => ({ ok: true, version: expectedVersion + 1, savedAt: "2026-10-14T05:00:00.000Z" }));
  const actions = {
    checkSlugAction: vi.fn(async () => ({ status: "available" })),
    setSlugAction: vi.fn(async ({ slug }) => ({ ok: true, slug })),
    newPreviewLinkAction: vi.fn(async () => ({ ok: true, previewToken: "tok_2" })),
    publishAction: vi.fn(async ({ expectedVersion, slug }) => ({ ok: true, status: "published", slug, liveVersion: expectedVersion })),
    updateLiveAction: vi.fn(async ({ expectedVersion }) => ({ ok: true, liveVersion: expectedVersion })),
    ...publishActions,
  };
  const lifecycle = {
    takeOfflineAction: vi.fn(async () => ({ ok: true, status: "offline", offlineAt: "2026-10-14T05:00:00.000Z", purgeAt: "2026-11-13T05:00:00.000Z" })),
    putOnlineAction: vi.fn(async ({ offlineOn }) => ({ ok: true, status: "published", offlineOn })),
    setOfflineOnAction: vi.fn(async ({ offlineOn }) => ({ ok: true, offlineOn })),
    deleteInvitationAction: vi.fn(async () => ({ ok: true, status: "deleted", deletedAt: "2026-10-14T05:00:00.000Z", purgeAt: "2026-11-13T05:00:00.000Z" })),
    restoreInvitationAction: vi.fn(async () => ({ ok: true, status: "draft", purgeAt: null })),
    eraseNowAction: vi.fn(async () => ({ ok: true })),
    ...lifecycleActions,
  };
  const utils = render(
    <EditorShell
      invitation={inv}
      initialStep={initialStep}
      templates={TEMPLATE_CHOICES}
      saveAction={save}
      publishActions={actions}
      lifecycleActions={lifecycle}
    />,
  );
  return { ...utils, invitation: inv, saveAction: save, publishActions: actions, lifecycleActions: lifecycle };
}
