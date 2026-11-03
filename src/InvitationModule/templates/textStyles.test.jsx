import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { compileString } from "sass";
import InvitationRenderer from "../InvitationRenderer";
import { parseInvitation } from "../schema/invitation";
import { TEMPLATES } from "./registry";

// CSS modules are empty under Vitest; name every class after its key so the class mapping can be checked.
vi.mock("../lib/styles", () => ({ mergeStyles: () => new Proxy({}, { get: (_, key) => (typeof key === "string" ? key : undefined) }) }));

// The classes each template renders for the four text-style groups (names: opening, cover, couple, closing).
const shared = (opening) => ({ names: [...opening, "coverNames", "personName"], parents: ["parents"], intro: ["eyebrow"], headings: ["sectionTitle"] });
const CLASSES = {
  royal: shared(["openingNames"]),
  floral: shared(["openingNames"]),
  minimal: shared([]),
  velvet: shared(["letterNames"]),
  temple: { names: ["openingNames", "heroName", "closingNames"], parents: ["heroParents"], intro: ["blessing"], headings: ["sectionTitle"] },
};

const build = (template, custom) => parseInvitation({ ...template.sample, language: "en", custom });
const scss = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

describe.each(TEMPLATES)("text styles in $id", (template) => {
  it("puts the chosen styles on the wrapper and renders every styled element", () => {
    const { container } = render(<InvitationRenderer invitation={build(template, { styles: { names: { size: "xl", bold: true, italic: true } } })} />);
    const style = container.firstChild.style;
    expect(style.getPropertyValue("--names-scale")).toBe("1.4");
    expect(style.getPropertyValue("--names-weight")).toBe("700");
    expect(style.getPropertyValue("--names-style")).toBe("italic");
    for (const cls of Object.values(CLASSES[template.id]).flat()) expect(container.querySelector(`.${cls}`), cls).not.toBeNull();
  });

  // Every font-size on a styled element scales with its group (em sizes follow their parent).
  it("scales every size of each group's elements in its SCSS", () => {
    const css = compileString(scss("./base/base.module.scss") + scss(`./${template.id}/${template.id}.module.scss`)).css;
    for (const [group, classes] of Object.entries(CLASSES[template.id])) {
      for (const cls of classes) {
        // Pseudo-elements are ornaments, not the text.
        const rules = [...css.matchAll(new RegExp(`([^{}]*\\.${cls}(?![\\w-])[^{}]*)\\{([^}]*)\\}`, "g"))].filter(([, selector]) => !selector.includes("::"));
        const sizes = rules.flatMap(([, selector, body]) => [...body.matchAll(/font-size:([^;]+)/g)].map(([, v]) => `${selector.trim()} → ${v.trim()}`));
        expect(sizes.some((v) => v.includes(`--${group}-scale`)), `${cls} uses --${group}-scale`).toBe(true);
        expect(sizes.filter((v) => !v.includes(`--${group}-scale`) && !/\d(\.\d+)?em$/.test(v))).toEqual([]);
      }
    }
  });
});
