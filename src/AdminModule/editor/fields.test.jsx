import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LocalisedInput, TextInput } from "./fields";

describe("LocalisedInput", () => {
  it("shows English and Hindi fields side by side for a bilingual invitation", () => {
    render(<LocalisedInput label="Bride's name" value={{ en: "Priya", hi: "प्रिया" }} language="both" onChange={() => {}} />);
    expect(screen.getByLabelText("Bride's name (English)")).toHaveValue("Priya");
    expect(screen.getByLabelText("Bride's name (हिंदी)")).toHaveValue("प्रिया");
    expect(screen.getByLabelText("Bride's name (हिंदी)")).toHaveAttribute("lang", "hi");
  });

  it("shows one field for a single-language invitation but keeps the other language's text", () => {
    const onChange = vi.fn();
    render(<LocalisedInput label="Bride's name" value={{ en: "Priya", hi: "प्रिया" }} language="en" onChange={onChange} />);
    expect(screen.queryByLabelText(/हिंदी/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Bride's name"), { target: { value: "Priyanka" } });
    expect(onChange).toHaveBeenCalledWith({ en: "Priyanka", hi: "प्रिया" });
  });
});

describe("TextInput", () => {
  it("marks an invalid value and explains it", () => {
    render(<TextInput label="Google Maps link" value="maps.google.com" error="Use the full link" onChange={() => {}} />);
    const input = screen.getByLabelText("Google Maps link");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Use the full link");
  });

  it("shows a hint when there is no error", () => {
    render(<TextInput label="Phone" value="" hint="Shown to guests" onChange={() => {}} />);
    expect(screen.getByLabelText("Phone")).toHaveAccessibleDescription("Shown to guests");
  });
});
