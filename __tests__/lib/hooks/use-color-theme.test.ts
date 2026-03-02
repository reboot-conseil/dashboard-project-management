import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});

// Spy on document.documentElement.setAttribute without replacing the whole document
vi.spyOn(document.documentElement, "setAttribute").mockImplementation(() => {});

import { useColorTheme } from "@/lib/hooks/use-color-theme";

describe("useColorTheme", () => {
  beforeEach(() => { Object.keys(store).forEach((k) => delete store[k]); });

  it("defaults to classique", () => {
    const { result } = renderHook(() => useColorTheme());
    expect(result.current.colorTheme).toBe("classique");
  });

  it("toggles to sobre", () => {
    const { result } = renderHook(() => useColorTheme());
    act(() => result.current.setColorTheme("sobre"));
    expect(result.current.colorTheme).toBe("sobre");
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useColorTheme());
    act(() => result.current.setColorTheme("sobre"));
    expect(store["color-theme"]).toBe("sobre");
  });
});
