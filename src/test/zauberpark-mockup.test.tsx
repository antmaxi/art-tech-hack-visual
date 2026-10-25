import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ZauberparkConcept } from "@/components/ZauberparkConcept";

afterEach(() => cleanup());

describe("Zauberpark mockup", () => {
  it("shows the supplied photograph alone, with no projections, controls or captions", () => {
    render(<ZauberparkConcept container={{ current: null }} open onOpenChange={() => {}} />);
    const dialog = screen.getByRole("dialog");
    // the photograph is the only content, and it is the supplied one
    expect(dialog.querySelectorAll("img").length).toBe(1);
    expect(dialog.querySelector("img")?.getAttribute("src")).toContain("zauberpark-photograph.png");
    // the previous mockup is gone: no live artwork is sampled or drawn any more
    expect(dialog.querySelectorAll("canvas").length).toBe(0);
    expect(screen.queryByRole("button", { name: /sound/i })).toBeNull();
    expect(screen.queryByText("Breathing")).toBeNull();
    expect(screen.queryByText("Still")).toBeNull();
  });

  it("sits the sketch directly over the photograph and labels the board as hypothetical", () => {
    render(<ZauberparkConcept container={{ current: null }} open onOpenChange={() => {}} />);
    const dialog = screen.getByRole("dialog");
    const photograph = dialog.querySelector("img")!;
    const sketch = dialog.querySelector("svg")!;
    // the sketch shares the photograph's frame (bottom-left overlay), it is not a footer row
    expect(sketch.parentElement).toBe(photograph.parentElement);
    expect(dialog.querySelector("footer")?.contains(sketch)).toBe(false);
    expect(screen.getByText("HYPOTHETICAL PROPOSAL · POTENTIAL EXHIBITION CONTEXT · ZURICH, SWITZERLAND")).toBeTruthy();
  });
});
