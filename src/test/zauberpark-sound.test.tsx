import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZauberparkConcept } from "@/components/ZauberparkConcept";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Zauberpark optional sound", () => {
  it("does not start sound when the concept opens; only a deliberate sound click requests it", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const toggleSound = vi.fn();
    render(<ZauberparkConcept source={{ current: null }} container={{ current: null }} open onOpenChange={() => {}} sound={false} onToggleSound={toggleSound} year={1991} />);
    expect(toggleSound).toHaveBeenCalledTimes(0);
    fireEvent.click(screen.getByRole("button", { name: "Turn sound on" }));
    expect(toggleSound).toHaveBeenCalledTimes(1);
  });
});