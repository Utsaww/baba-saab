import { useState } from "react";
import { render } from "@testing-library/react";
import { cleanDraft } from "@/InvitationModule/schema/draft";
import { setIn } from "./paths";

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
    const update = (path, value) => setContent((c) => setIn(c, path, value));
    const { errors } = cleanDraft(content);
    return <Step content={content} update={update} errors={errors} language={content.language ?? "en"} templates={TEMPLATE_CHOICES} onGoToStep={() => {}} {...extraProps} />;
  }
  const utils = render(<Harness />);
  return { ...utils, latest: () => current };
}
