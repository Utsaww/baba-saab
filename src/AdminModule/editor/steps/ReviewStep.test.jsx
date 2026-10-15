import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewStep from "./ReviewStep";
import { renderStep } from "../test-utils";

const complete = () => ({
  templateId: "royal",
  theme: { palette: "maroon-gold" },
  language: "en",
  couple: { bride: { name: { en: "Priya" } }, groom: { name: { en: "Rahul" } } },
  mainDate: "2027-02-14",
  venue: { name: { en: "Riviera" }, address: { en: "MG Road" } },
});

const publishing = () => ({
  live: { status: "draft", slug: "priya-weds-rahul-k3f9", previewToken: "tok_1", liveVersion: null, publishedContent: null },
  state: "draft",
  busy: false,
  error: null,
  origin: "https://www.babasaab.com",
  onSetSlug: vi.fn(),
  onCheckSlug: vi.fn(),
  onPublish: vi.fn(),
  onUpdateLive: vi.fn(),
  onNewPreviewLink: vi.fn(),
});

describe("ReviewStep", () => {
  it("lists what is missing and jumps to the step that fixes it", async () => {
    const onGoToStep = vi.fn();
    renderStep(ReviewStep, { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" }, { onGoToStep });
    expect(screen.getByText("Add the bride's name")).toBeInTheDocument();
    expect(screen.getByText("Add the wedding date")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Go to step 3" })[0]);
    expect(onGoToStep).toHaveBeenCalledWith(3);
  });

  it("says when everything needed is filled in", () => {
    renderStep(ReviewStep, complete());
    expect(screen.getByText("Everything needed is filled in.")).toBeInTheDocument();
  });

  it("shows the publish panel, with Publish ready once nothing is missing", () => {
    renderStep(ReviewStep, complete(), { publishing: publishing() });
    expect(screen.getByLabelText("Link name")).toHaveValue("priya-weds-rahul-k3f9");
    expect(screen.getByRole("button", { name: "Publish" })).toBeEnabled();
  });

  it("keeps Publish disabled while the checklist has items", () => {
    renderStep(ReviewStep, { templateId: "royal", theme: { palette: "maroon-gold" }, language: "en" }, { publishing: publishing() });
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });
});
